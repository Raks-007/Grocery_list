import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api.dart';

class ShoppingListDetailScreen extends StatefulWidget {
  final int listId;
  const ShoppingListDetailScreen({super.key, required this.listId});
  @override
  State<ShoppingListDetailScreen> createState() => _ShoppingListDetailScreenState();
}

class _ShoppingListDetailScreenState extends State<ShoppingListDetailScreen> {
  Map<String, dynamic>? listData;
  List items = [];
  List masterItems = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    final resList = await ApiService.get('/shopping-lists/${widget.listId}');
    final resMaster = await ApiService.get('/master-items');
    if (mounted) {
      setState(() {
        listData = resList['data'];
        items = resList['data']['items'] ?? [];
        masterItems = resMaster['data'] ?? [];
        isLoading = false;
      });
    }
  }

  void _showAddItemSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF18181B),
      builder: (ctx) => ListView.builder(
        itemCount: masterItems.length,
        itemBuilder: (ctx, i) {
          final mItem = masterItems[i];
          return ListTile(
            title: Text(mItem['item_name']),
            subtitle: Text(mItem['category_name'] ?? ''),
            trailing: const Icon(LucideIcons.plus),
            onTap: () async {
              await ApiService.post('/shopping-lists/${widget.listId}/items', {
                'master_item_id': mItem['id'],
                'quantity': mItem['default_quantity'],
                'unit': mItem['unit']
              });
              Navigator.pop(ctx);
              loadData();
            },
          );
        },
      ),
    );
  }

  Future<void> _togglePurchased(int itemId, bool val) async {
    await ApiService.put('/shopping-lists/${widget.listId}/items/$itemId', {'purchased': val});
    loadData();
  }

  Future<void> _completeList() async {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Trip'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'Total Spent (\$)'), keyboardType: TextInputType.number),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await ApiService.post('/shopping-lists/${widget.listId}/complete', {'total_spent': double.tryParse(ctrl.text) ?? 0});
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    
    return Scaffold(
      appBar: AppBar(
        title: Text(listData?['list_name'] ?? 'List Details'),
      ),
      body: items.isEmpty 
        ? const Center(child: Text('No items yet. Add some!'))
        : ListView.builder(
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              final isPurchased = item['purchased'] == 1 || item['purchased'] == true;
              return CheckboxListTile(
                value: isPurchased,
                onChanged: (val) => _togglePurchased(item['id'], val ?? false),
                title: Text(
                  item['item_name'], 
                  style: TextStyle(decoration: isPurchased ? TextDecoration.lineThrough : null, color: isPurchased ? Colors.grey : Colors.white),
                ),
                subtitle: Text('${item['quantity']} ${item['unit']} • ${item['category_name']}'),
                secondary: IconButton(
                  icon: const Icon(LucideIcons.trash2, color: Colors.red),
                  onPressed: () async {
                    await ApiService.delete('/shopping-lists/${widget.listId}/items/${item['id']}');
                    loadData();
                  },
                ),
              );
            },
          ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
               Expanded(
                 child: OutlinedButton.icon(
                   onPressed: _showAddItemSheet,
                   icon: const Icon(LucideIcons.plus),
                   label: const Text('Add Item'),
                   style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                 ),
               ),
               const SizedBox(width: 16),
               Expanded(
                 child: ElevatedButton.icon(
                   onPressed: _completeList,
                   icon: const Icon(LucideIcons.checkCheck),
                   label: const Text('Finish List'),
                   style: ElevatedButton.styleFrom(
                     backgroundColor: Colors.green,
                     foregroundColor: Colors.white,
                     padding: const EdgeInsets.symmetric(vertical: 16)
                   ),
                 ),
               ),
            ],
          ),
        ),
      ),
    );
  }
}
