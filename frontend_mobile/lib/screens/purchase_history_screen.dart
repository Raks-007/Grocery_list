import 'package:flutter/material.dart';
import '../data/repository.dart';
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
    final res = await Repository().getPurchaseHistory();
    if (mounted) {
      setState(() {
        history = res;
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Purchase History'), backgroundColor: Colors.transparent, elevation: 0),
      drawer: const AppDrawer(),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : history.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No purchase history yet',
                          style: TextStyle(color: Colors.grey, fontSize: 18)),
                      SizedBox(height: 8),
                      Text('Complete a shopping list to see it here',
                          style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: history.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final record = history[index];
                    return Card(
                      color: const Color(0xFF18181B),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFF27272A)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: CircleAvatar(
                          backgroundColor: Colors.green.withValues(alpha: 0.15),
                          child: const Icon(Icons.check_circle_outline, color: Colors.green),
                        ),
                        title: Text(record['list_name'],
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            '${record['total_items']} items  •  ${(record['completed_date'] ?? '').toString().substring(0, 10)}',
                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ),
                        trailing: Text(
                          '\$${record['total_spent']?.toStringAsFixed(2) ?? '0.00'}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.greenAccent,
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
