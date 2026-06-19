import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// ConnectivityService monitors network status and notifies listeners
/// when the device goes online or offline.
/// 
/// HOW IT WORKS:
/// - Uses the `connectivity_plus` package to listen for network changes
/// - Exposes a Stream<bool> that emits true (online) or false (offline)
/// - The SyncEngine listens to this stream and triggers sync when going online
/// 
/// WHY A SEPARATE SERVICE?
/// Separation of concerns: the sync engine shouldn't care HOW we detect
/// connectivity — it just needs to know WHEN connectivity changes.
class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  
  // StreamController that broadcasts connectivity state changes
  final _controller = StreamController<bool>.broadcast();
  
  /// Stream of connectivity state: true = online, false = offline
  Stream<bool> get onConnectivityChanged => _controller.stream;
  
  bool _isOnline = true;
  
  /// Current connectivity status
  bool get isOnline => _isOnline;

  StreamSubscription? _subscription;

  /// Start listening for connectivity changes
  void initialize() {
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      // connectivity_plus returns a List<ConnectivityResult>
      final wasOnline = _isOnline;
      _isOnline = results.any((r) => r != ConnectivityResult.none);
      
      // Only emit when the state actually changes
      if (_isOnline != wasOnline) {
        _controller.add(_isOnline);
        if (_isOnline) {
          print('📶 Device is ONLINE — triggering sync...');
        } else {
          print('📵 Device is OFFLINE — working locally');
        }
      }
    });
  }

  /// Check current connectivity status right now
  Future<bool> checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    _isOnline = results.any((r) => r != ConnectivityResult.none);
    return _isOnline;
  }

  /// Clean up resources
  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}
