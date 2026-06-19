import 'package:flutter/material.dart';
import '../data/repository.dart';

class ShoppingListDetailScreen extends StatefulWidget {
  final String listUuid;
  const ShoppingListDetailScreen({super.key, required this.listUuid});
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
    final list = await Repository().getShoppingList(widget.listUuid);
    final master = await Repository().getMasterItems();
    if (mounted) {
      setState(() {
        listData = list;
        items = list?['items'] ?? [];
        masterItems = master;
        isLoading = false;
      });
    }
  }

  void _showAddItemSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF18181B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text('Add Item to List',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFF27272A), height: 1),
          Expanded(
            child: masterItems.isEmpty
                ? const Center(child: Text('No master items found. Add items first.', style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    itemCount: masterItems.length,
                    itemBuilder: (ctx, i) {
                      final mItem = masterItems[i];
                      return ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFF27272A),
                          child: Icon(Icons.inventory_2_outlined, color: Color(0xFF9333EA), size: 18),
                        ),
                        title: Text(mItem['item_name']),
                        subtitle: Text(mItem['category_name'] ?? 'Uncategorized',
                            style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        trailing: const Icon(Icons.add_circle_outline, color: Color(0xFF9333EA)),
                        onTap: () async {
                          await Repository().addItemToList(
                            listUuid: widget.listUuid,
                            masterItemUuid: mItem['uuid'],
                            quantity: mItem['default_quantity'] ?? 1,
                            unit: mItem['unit'] ?? 'pcs',
                          );
                          if (!context.mounted) return;
                          Navigator.pop(ctx);
                          loadData();
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _togglePurchased(String itemUuid, bool val) async {
    await Repository().togglePurchased(itemUuid, val);
    loadData();
  }

  Future<void> _completeList() async {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        title: const Text('Complete Trip'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'Total Spent (\$)', hintText: '0.00'),
          keyboardType: TextInputType.number,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            onPressed: () async {
              await Repository().completeList(
                  widget.listUuid,
                  double.tryParse(ctrl.text) ?? 0);
              if (!context.mounted) return;
              Navigator.pop(ctx);
              if (!context.mounted) return;
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

    final purchased = items.where((i) => i['purchased'] == 1 || i['purchased'] == true).length;
    final total = items.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(listData?['list_name'] ?? 'List Details'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (total > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: Chip(
                label: Text('$purchased/$total', style: const TextStyle(fontSize: 12)),
                backgroundColor: const Color(0xFF27272A),
              ),
            ),
        ],
      ),
      body: items.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_shopping_cart, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No items yet', style: TextStyle(color: Colors.grey, fontSize: 18)),
                  SizedBox(height: 8),
                  Text('Tap "Add Item" below to get started', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : ListView.builder(
              itemCount: items.length,
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final item = items[index];
                final isPurchased = item['purchased'] == 1 || item['purchased'] == true;
                return Card(
                  color: const Color(0xFF18181B),
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(
                      color: isPurchased
                          ? Colors.green.withValues(alpha: 0.4)
                          : const Color(0xFF27272A),
                    ),
                  ),
                  child: CheckboxListTile(
                    value: isPurchased,
                    onChanged: (val) => _togglePurchased(item['uuid'], val ?? false),
                    activeColor: Colors.green,
                    title: Text(
                      item['item_name'],
                      style: TextStyle(
                        decoration: isPurchased ? TextDecoration.lineThrough : null,
                        color: isPurchased ? Colors.grey : Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    subtitle: Text(
                      '${item['quantity']} ${item['unit']}  •  ${item['category_name'] ?? ''}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    secondary: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                      onPressed: () async {
                        await Repository().deleteListItem(item['uuid']);
                        loadData();
                      },
                    ),
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
                  icon: const Icon(Icons.add),
                  label: const Text('Add Item'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFF9333EA)),
                    foregroundColor: const Color(0xFF9333EA),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _completeList,
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Finish List'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
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
