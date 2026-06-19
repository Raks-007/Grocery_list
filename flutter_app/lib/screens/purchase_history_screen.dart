import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api.dart';
import '../widgets/app_drawer.dart';

class PurchaseHistoryScreen extends StatefulWidget {
  const PurchaseHistoryScreen({super.key});
  @override
  State<PurchaseHistoryScreen> createState() => _PurchaseHistoryScreenState();
}

class _PurchaseHistoryScreenState extends State<PurchaseHistoryScreen> {
  List history = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    final res = await ApiService.get('/purchase-history');
    if (mounted) {
      setState(() {
        history = res['data'] ?? [];
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Purchase History')),
      drawer: const AppDrawer(),
      body: isLoading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
        itemCount: history.length,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          final record = history[index];
          return Card(
            color: const Color(0xFF18181B),
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const CircleAvatar(backgroundColor: Colors.green, child: Icon(LucideIcons.check, color: Colors.white)),
              title: Text(record['list_name'], style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${record['total_items']} items • ${record['completed_date']?.substring(0, 10)}'),
              trailing: Text('\$${record['total_spent']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.greenAccent)),
            ),
          );
        },
      ),
    );
  }
}
