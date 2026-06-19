import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../api.dart';
import '../widgets/app_drawer.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});
  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List categories = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadCategories();
  }

  Future<void> loadCategories() async {
    final res = await ApiService.get('/categories');
    if (mounted) {
      setState(() {
        categories = res['data'] ?? [];
        isLoading = false;
      });
    }
  }

  Future<void> _addCategory(String name) async {
    await ApiService.post('/categories', {'category_name': name});
    loadCategories();
  }

  void _showAddDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Category'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Category Name (e.g. Produce)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                _addCategory(controller.text);
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      drawer: const AppDrawer(),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final cat = categories[index];
              return ListTile(
                leading: const Icon(LucideIcons.tag),
                title: Text(cat['category_name']),
              );
            },
          ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: const Icon(LucideIcons.plus),
      ),
    );
  }
}
