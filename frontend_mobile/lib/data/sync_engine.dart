import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'local_database.dart';
import 'connectivity_service.dart';

/// SyncEngine is the brain of offline-first.
/// 
/// It coordinates data flow between the local SQLite database and the
/// remote Express + MySQL server.
/// 
/// HOW IT WORKS:
/// 1. PUSH first: Send local dirty records to the server
/// 2. PULL second: Get changes from the server since last sync
/// 3. Auto-trigger: Sync runs when the device comes online
/// 
/// WHY PUSH FIRST?
/// If we pull first, we might overwrite local changes with older server data.
/// By pushing first, the server has our latest changes before we pull.
/// The server then applies "last write wins" — if our local change is newer
/// than the server's version, our change wins. If the server has a newer
/// version (someone edited from the web), the server keeps its version
/// and we'll get it in the pull.
class SyncEngine {
  static final SyncEngine _instance = SyncEngine._internal();
  factory SyncEngine() => _instance;
  SyncEngine._internal();

  final ConnectivityService _connectivity = ConnectivityService();
  bool _isSyncing = false;
  StreamSubscription? _connectivitySubscription;

  // Callback to notify UI about sync state changes
  void Function(SyncStatus)? onSyncStatusChanged;

  /// Initialize the sync engine and start listening for connectivity changes
  void initialize() {
    _connectivity.initialize();
    
    // When device goes online, trigger a sync
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((isOnline) {
      if (isOnline) {
        sync();
      }
    });
  }

  /// Get the API base URL (same logic as ApiService)
  String get _baseUrl {
    return 'https://grocerylist-production-365a.up.railway.app/api';
  }

  /// Get auth headers
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Main sync method — call this to trigger a full sync cycle
  Future<void> sync() async {
    // Prevent concurrent syncs
    if (_isSyncing) return;
    
    // Check if we're actually online
    final isOnline = await _connectivity.checkConnectivity();
    if (!isOnline) return;

    _isSyncing = true;
    onSyncStatusChanged?.call(SyncStatus.syncing);

    try {
      await _pushLocalChanges();
      await _pullServerChanges();
      onSyncStatusChanged?.call(SyncStatus.synced);
      print('✅ Sync completed successfully');
    } catch (e) {
      print('❌ Sync failed: $e');
      onSyncStatusChanged?.call(SyncStatus.error);
    } finally {
      _isSyncing = false;
    }
  }

  /// PUSH: Send all local dirty records to the server
  /// 
  /// For each dirty record, we send:
  /// - table name
  /// - uuid (so the server can identify it)
  /// - the data fields
  /// - updated_at timestamp
  /// - is_deleted flag
  Future<void> _pushLocalChanges() async {
    final tables = ['categories', 'master_items', 'shopping_lists', 'shopping_list_items', 'purchase_history'];
    final List<Map<String, dynamic>> changes = [];

    for (final table in tables) {
      final dirtyRecords = await LocalDatabase.getDirty(table);
      for (final record in dirtyRecords) {
        // Build the data payload (exclude local-only fields)
        final data = Map<String, dynamic>.from(record);
        data.remove('id');       // Server has its own IDs
        data.remove('is_dirty'); // Server doesn't know about this
        
        changes.add({
          'table': table,
          'uuid': record['uuid'],
          'data': data,
          'updated_at': record['updated_at'],
          'is_deleted': record['is_deleted'] == 1,
        });
      }
    }

    if (changes.isEmpty) {
      print('📤 No local changes to push');
      return;
    }

    print('📤 Pushing ${changes.length} local changes...');

    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/sync/push'),
        headers: headers,
        body: jsonEncode({'changes': changes}),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          // Mark all pushed records as clean
          for (final change in changes) {
            await LocalDatabase.markClean(change['table'], change['uuid']);
          }
          print('📤 Push complete: ${changes.length} changes synced');
        }
      } else {
        print('📤 Push failed with status: ${response.statusCode}');
      }
    } catch (e) {
      print('📤 Push error: $e');
      // Don't throw — we still want to try pulling
    }
  }

  /// PULL: Get all changes from the server since our last sync
  /// 
  /// The server returns records modified after our last sync timestamp.
  /// We upsert each record into the local database.
  /// Deleted records (is_deleted=1) are also synced so we can remove them locally.
  Future<void> _pullServerChanges() async {
    final lastSync = await LocalDatabase.getLastSyncTime();
    final since = lastSync ?? '1970-01-01T00:00:00Z';

    print('📥 Pulling changes since: $since');

    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/sync/pull?since=$since'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];

          // Upsert categories
          int catCount = 0;
          for (final cat in data['categories'] ?? []) {
            await _upsertIfNotDirty('categories', _cleanServerRecord(cat));
            catCount++;
          }

          // Upsert master items
          int itemCount = 0;
          for (final item in data['masterItems'] ?? []) {
            await _upsertIfNotDirty('master_items', _cleanServerRecord(item));
            itemCount++;
          }

          // Upsert shopping lists
          int listCount = 0;
          for (final list in data['shoppingLists'] ?? []) {
            await _upsertIfNotDirty('shopping_lists', _cleanServerRecord(list));
            listCount++;
          }

          // Upsert shopping list items
          int sliCount = 0;
          for (final item in data['shoppingListItems'] ?? []) {
            await _upsertIfNotDirty('shopping_list_items', _cleanServerRecord(item));
            sliCount++;
          }

          // Upsert purchase history
          int phCount = 0;
          for (final record in data['purchaseHistory'] ?? []) {
            await _upsertIfNotDirty('purchase_history', _cleanServerRecord(record));
            phCount++;
          }

          // Save the server's timestamp as our new "last sync" point
          if (data['serverTime'] != null) {
            await LocalDatabase.setLastSyncTime(data['serverTime']);
          }

          print('📥 Pull complete: $catCount cats, $itemCount items, $listCount lists, $sliCount list items, $phCount history');
        }
      } else if (response.statusCode == 401) {
        print('📥 Pull failed: unauthorized (token expired?)');
      } else {
        print('📥 Pull failed with status: ${response.statusCode}');
      }
    } catch (e) {
      print('📥 Pull error: $e');
      rethrow;
    }
  }

  /// Only upsert from server if the local record is NOT dirty.
  /// If it's dirty, our local version takes precedence (it will be pushed next sync).
  Future<void> _upsertIfNotDirty(String table, Map<String, dynamic> data) async {
    final uuid = data['uuid'];
    if (uuid == null) return;
    
    final existing = await LocalDatabase.getByUuid(table, uuid);
    if (existing != null && existing['is_dirty'] == 1) {
      // Local record has unsaved changes — don't overwrite
      return;
    }
    await LocalDatabase.upsertFromServer(table, data);
  }

  /// Clean server record to match local SQLite schema
  /// Removes fields that don't exist in the local tables
  Map<String, dynamic> _cleanServerRecord(Map<String, dynamic> record) {
    final clean = Map<String, dynamic>.from(record);
    clean.remove('id'); // Server auto-increment IDs don't apply locally
    return clean;
  }

  /// Perform an initial full sync after login
  /// This downloads all data from the server to populate the local database
  Future<void> initialSync() async {
    final isOnline = await _connectivity.checkConnectivity();
    if (!isOnline) return;

    _isSyncing = true;
    onSyncStatusChanged?.call(SyncStatus.syncing);

    try {
      // Pull everything (since epoch = get all data)
      await _pullServerChanges();
      onSyncStatusChanged?.call(SyncStatus.synced);
    } catch (e) {
      onSyncStatusChanged?.call(SyncStatus.error);
    } finally {
      _isSyncing = false;
    }
  }

  void dispose() {
    _connectivitySubscription?.cancel();
  }
}

/// Represents the current sync state for UI display
enum SyncStatus {
  synced,    // All data is up to date
  syncing,   // Currently syncing
  offline,   // No internet connection
  error,     // Sync failed
}
