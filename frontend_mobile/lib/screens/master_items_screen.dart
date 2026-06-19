import 'package:flutter/material.dart';
import '../data/repository.dart';
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
  String search = '';

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    final resItems = await Repository().getMasterItems();
    final resCats = await Repository().getCategories();
    if (mounted) {
      setState(() {
        items = resItems;
        categories = resCats;
        isLoading = false;
      });
    }
  }

  void _showAddDialog() {
    final nameCtrl = TextEditingController();
    final unitCtrl = TextEditingController(text: 'pcs');
    final qtyCtrl = TextEditingController(text: '1');
    String? selectedCategoryUuid;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF18181B),
          title: const Text('Add New Item'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Item Name', hintText: 'e.g. Milk'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Category'),
                  dropdownColor: const Color(0xFF18181B),
                  value: selectedCategoryUuid,
                  items: categories
                      .map<DropdownMenuItem<String>>(
                        (c) => DropdownMenuItem<String>(
                          value: c['uuid'],
                          child: Text(c['category_name']),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setDialogState(() => selectedCategoryUuid = v),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: qtyCtrl,
                        decoration: const InputDecoration(labelText: 'Default Qty'),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: unitCtrl,
                        decoration: const InputDecoration(labelText: 'Unit'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9333EA), foregroundColor: Colors.white),
              onPressed: () async {
                if (nameCtrl.text.trim().isNotEmpty && selectedCategoryUuid != null) {
                  await Repository().addMasterItem(
                    name: nameCtrl.text.trim(),
                    categoryUuid: selectedCategoryUuid!,
                    defaultQuantity: double.tryParse(qtyCtrl.text) ?? 1,
                    unit: unitCtrl.text.trim(),
                  );
                  if (!context.mounted) return;
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
    final filtered = items
        .where((i) =>
            i['item_name'].toString().toLowerCase().contains(search.toLowerCase()) ||
            (i['category_name'] ?? '').toString().toLowerCase().contains(search.toLowerCase()))
        .toList();

    return Scaffold(
      appBar: AppBar(
          title: const Text('Master Items'), backgroundColor: Colors.transparent, elevation: 0),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              onChanged: (v) => setState(() => search = v),
              decoration: const InputDecoration(
                hintText: 'Search items or categories...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(
                        child: Text('No items found.', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          return Card(
                            color: const Color(0xFF18181B),
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(color: Color(0xFF27272A)),
                            ),
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0xFF27272A),
                                child: Icon(Icons.inventory_2_outlined,
                                    color: Color(0xFF9333EA), size: 20),
                              ),
                              title: Text(item['item_name'],
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                '${item['category_name'] ?? 'Uncategorized'}  •  ${item['default_quantity']} ${item['unit']}',
                                style: const TextStyle(color: Colors.grey, fontSize: 12),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                onPressed: () async {
                                  await Repository().deleteMasterItem(item['uuid']);
                                  loadData();
                                },
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}
