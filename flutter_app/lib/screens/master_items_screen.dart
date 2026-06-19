import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api.dart';
import '../widgets/app_drawer.dart';

class MasterItemsScreen extends StatefulWidget {
  const MasterItemsScreen({super.key});
  @override
  State<MasterItemsScreen> createState() => _MasterItemsScreenState();
}

class _MasterItemsScreenState extends State<MasterItemsScreen> {
  List items = [];
  List categories = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    final resItems = await ApiService.get('/master-items');
    final resCats = await ApiService.get('/categories');
    if (mounted) {
      setState(() {
        items = resItems['data'] ?? [];
        categories = resCats['data'] ?? [];
        isLoading = false;
      });
    }
  }

  void _showAddDialog() {
    final nameCtrl = TextEditingController();
    final unitCtrl = TextEditingController(text: 'pcs');
    final qtyCtrl = TextEditingController(text: '1');
    int? selectedCategoryId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add New Item'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Item Name')),
                DropdownButtonFormField<int>(
                  decoration: const InputDecoration(labelText: 'Category'),
                  value: selectedCategoryId,
                  items: categories.map<DropdownMenuItem<int>>((c) => DropdownMenuItem<int>(
                    value: c['id'],
                    child: Text(c['category_name']),
                  )).toList(),
                  onChanged: (v) => setDialogState(() => selectedCategoryId = v),
                ),
                Row(
                  children: [
                    Expanded(child: TextField(controller: qtyCtrl, decoration: const InputDecoration(labelText: 'Default Qty'), keyboardType: TextInputType.number)),
                    const SizedBox(width: 16),
                    Expanded(child: TextField(controller: unitCtrl, decoration: const InputDecoration(labelText: 'Unit'))),
                  ],
                )
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.isNotEmpty && selectedCategoryId != null) {
                  await ApiService.post('/master-items', {
                    'item_name': nameCtrl.text,
                    'category_id': selectedCategoryId,
                    'default_quantity': double.tryParse(qtyCtrl.text) ?? 1,
                    'unit': unitCtrl.text,
                  });
                  Navigator.pop(ctx);
                  loadData();
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Master Items')),
      drawer: const AppDrawer(),
      body: isLoading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return ListTile(
            title: Text(item['item_name']),
            subtitle: Text('Category: ${item['category_name'] ?? 'None'} • Default: ${item['default_quantity']} ${item['unit']}'),
            leading: const Icon(LucideIcons.package),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(LucideIcons.plus)),
    );
  }
}
