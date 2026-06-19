import 'package:uuid/uuid.dart';
import 'local_database.dart';
import 'sync_engine.dart';
import 'connectivity_service.dart';

/// Repository is the single data access layer that all UI screens use.
/// 
/// WHY A REPOSITORY?
/// Your screens should never care WHERE data comes from.
/// They just call `repository.getCategories()` and get data back instantly.
/// 
/// Under the hood, the Repository:
/// 1. Reads from local SQLite (instant, works offline)
/// 2. Writes to local SQLite (instant, works offline)
/// 3. Triggers sync in the background (if online)
/// 
/// This is the "Repository Pattern" — a very common architecture pattern
/// used in production apps (Android, iOS, Flutter, etc.)
class Repository {
  static final Repository _instance = Repository._internal();
  factory Repository() => _instance;
  Repository._internal();

  final SyncEngine _syncEngine = SyncEngine();
  final ConnectivityService _connectivity = ConnectivityService();
  final _uuid = const Uuid();

  /// Initialize the repository and its dependencies
  void initialize() {
    _connectivity.initialize();
    _syncEngine.initialize();
  }

  /// Trigger a manual sync (e.g., on pull-to-refresh)
  Future<void> sync() => _syncEngine.sync();

  /// Perform initial sync after login
  Future<void> initialSync() => _syncEngine.initialSync();

  /// Set callback for sync status changes
  set onSyncStatusChanged(void Function(SyncStatus) callback) {
    _syncEngine.onSyncStatusChanged = callback;
  }

  /// Whether we're currently online
  bool get isOnline => _connectivity.isOnline;

  // ============================================================
  // CATEGORIES
  // ============================================================

  /// Get all categories from local database (instant, offline-capable)
  Future<List<Map<String, dynamic>>> getCategories() {
    return LocalDatabase.getCategories();
  }

  /// Add a new category (saved locally, synced in background)
  Future<void> addCategory(String name) async {
    await LocalDatabase.insertLocal('categories', {
      'uuid': _uuid.v4(),
      'category_name': name,
    });
    // Try to sync in background (won't block the UI)
    _syncEngine.sync();
  }

  /// Delete a category (soft delete locally, synced in background)
  Future<void> deleteCategory(String uuid) async {
    await LocalDatabase.softDeleteLocal('categories', uuid);
    _syncEngine.sync();
  }

  // ============================================================
  // MASTER ITEMS
  // ============================================================

  /// Get all master items (with joined category name)
  Future<List<Map<String, dynamic>>> getMasterItems() {
    return LocalDatabase.getMasterItems();
  }

  /// Add a new master item
  Future<void> addMasterItem({
    required String name,
    required String categoryUuid,
    String unit = 'pcs',
    double defaultQuantity = 1,
  }) async {
    await LocalDatabase.insertLocal('master_items', {
      'uuid': _uuid.v4(),
      'item_name': name,
      'category_uuid': categoryUuid,
      'unit': unit,
      'default_quantity': defaultQuantity,
    });
    _syncEngine.sync();
  }

  /// Delete a master item
  Future<void> deleteMasterItem(String uuid) async {
    await LocalDatabase.softDeleteLocal('master_items', uuid);
    _syncEngine.sync();
  }

  // ============================================================
  // SHOPPING LISTS
  // ============================================================

  /// Get all shopping lists
  Future<List<Map<String, dynamic>>> getShoppingLists() {
    return LocalDatabase.getShoppingLists();
  }

  /// Get a single shopping list with its items
  Future<Map<String, dynamic>?> getShoppingList(String uuid) async {
    final list = await LocalDatabase.getShoppingList(uuid);
    if (list == null) return null;
    
    final items = await LocalDatabase.getShoppingListItems(uuid);
    return {...list, 'items': items};
  }

  /// Create a new shopping list
  Future<String> createShoppingList(String name) async {
    final listUuid = _uuid.v4();
    await LocalDatabase.insertLocal('shopping_lists', {
      'uuid': listUuid,
      'list_name': name,
      'status': 'Pending',
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
    _syncEngine.sync();
    return listUuid;
  }

  /// Add an item to a shopping list
  Future<void> addItemToList({
    required String listUuid,
    required String masterItemUuid,
    double quantity = 1,
    String unit = 'pcs',
    String priority = 'Medium',
  }) async {
    await LocalDatabase.insertLocal('shopping_list_items', {
      'uuid': _uuid.v4(),
      'shopping_list_uuid': listUuid,
      'master_item_uuid': masterItemUuid,
      'quantity': quantity,
      'unit': unit,
      'priority': priority,
      'purchased': 0,
    });
    _syncEngine.sync();
  }

  /// Toggle purchased status of a list item
  Future<void> togglePurchased(String uuid, bool purchased) async {
    await LocalDatabase.updateLocal('shopping_list_items', uuid, {
      'purchased': purchased ? 1 : 0,
    });
    _syncEngine.sync();
  }

  /// Delete an item from a shopping list
  Future<void> deleteListItem(String uuid) async {
    await LocalDatabase.softDeleteLocal('shopping_list_items', uuid);
    _syncEngine.sync();
  }

  /// Complete a shopping list
  Future<void> completeList(String listUuid, double totalSpent) async {
    // Update list status
    await LocalDatabase.updateLocal('shopping_lists', listUuid, {
      'status': 'Completed',
    });

    // Get item count for history
    final items = await LocalDatabase.getShoppingListItems(listUuid);

    // Create purchase history record
    await LocalDatabase.insertLocal('purchase_history', {
      'uuid': _uuid.v4(),
      'shopping_list_uuid': listUuid,
      'total_items': items.length,
      'total_spent': totalSpent,
      'completed_date': DateTime.now().toUtc().toIso8601String(),
    });

    _syncEngine.sync();
  }

  // ============================================================
  // PURCHASE HISTORY
  // ============================================================

  /// Get purchase history
  Future<List<Map<String, dynamic>>> getPurchaseHistory() {
    return LocalDatabase.getPurchaseHistory();
  }

  // ============================================================
  // AUTH / LIFECYCLE
  // ============================================================

  /// Call after successful login to download initial data
  Future<void> onLoginSuccess() async {
    await _syncEngine.initialSync();
  }

  /// Call on logout to clear local data
  Future<void> onLogout() async {
    await LocalDatabase.clearAll();
  }

  void dispose() {
    _syncEngine.dispose();
    _connectivity.dispose();
  }
}
