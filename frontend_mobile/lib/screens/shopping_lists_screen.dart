import 'package:flutter/material.dart';
import '../data/repository.dart';
import '../widgets/app_drawer.dart';
import 'shopping_list_detail_screen.dart';

class ShoppingListsScreen extends StatefulWidget {
  const ShoppingListsScreen({super.key});
  @override
  State<ShoppingListsScreen> createState() => _ShoppingListsScreenState();
}

class _ShoppingListsScreenState extends State<ShoppingListsScreen> {
  List lists = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    final res = await Repository().getShoppingLists();
    if (mounted) {
      setState(() {
        lists = res;
        isLoading = false;
      });
    }
  }

  void _showAddDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        title: const Text('New Shopping List'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'e.g. Weekly Groceries'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF9333EA), foregroundColor: Colors.white),
            onPressed: () async {
              if (ctrl.text.trim().isNotEmpty) {
                await Repository().createShoppingList(ctrl.text.trim());
                if (!context.mounted) return;
                Navigator.pop(ctx);
                loadData();
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeLists = lists.where((l) => l['status'] != 'Completed').toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Shopping Lists'), backgroundColor: Colors.transparent, elevation: 0),
      drawer: const AppDrawer(),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : activeLists.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No lists yet', style: TextStyle(color: Colors.grey, fontSize: 18)),
                      SizedBox(height: 8),
                      Text('Tap + to create your first shopping list', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: activeLists.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final list = activeLists[index];
                    return Card(
                      color: const Color(0xFF18181B),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFF27272A)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF9333EA).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.list_alt_rounded, color: Color(0xFF9333EA)),
                        ),
                        title: Text(list['list_name'],
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 6.0),
                          child: Text(
                            '${list['item_count'] ?? 0} items  •  Created ${(list['created_at'] ?? '').toString().substring(0, 10)}',
                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ),
                        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ShoppingListDetailScreen(listUuid: list['uuid']),
                            ),
                          );
                          loadData();
                        },
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}
