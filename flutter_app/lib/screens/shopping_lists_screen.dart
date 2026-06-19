import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api.dart';
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
    final res = await ApiService.get('/shopping-lists');
    if (mounted) {
      setState(() {
        lists = res['data'] ?? [];
        isLoading = false;
      });
    }
  }

  void _showAddDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Shopping List'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(hintText: 'List Name (e.g. Weekly)')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (ctrl.text.isNotEmpty) {
                await ApiService.post('/shopping-lists', {'list_name': ctrl.text});
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
      appBar: AppBar(title: const Text('Shopping Lists')),
      drawer: const AppDrawer(),
      body: isLoading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
        itemCount: activeLists.length,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          final list = activeLists[index];
          return Card(
            color: const Color(0xFF18181B),
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(list['list_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text('${list['item_count']} items • Created ${list['created_at']?.substring(0, 10)}'),
              ),
              trailing: const Icon(LucideIcons.chevronRight),
              onTap: () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => ShoppingListDetailScreen(listId: list['id'])));
                loadData();
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(LucideIcons.plus)),
    );
  }
}
