import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/auth_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/categories_screen.dart';
import '../screens/master_items_screen.dart';
import '../screens/shopping_lists_screen.dart';
import '../screens/purchase_history_screen.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF18181B),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(color: Color(0xFF09090B)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Icon(LucideIcons.package, size: 36, color: Colors.purpleAccent),
                SizedBox(height: 12),
                Text('Inventory Manager', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          _buildItem(context, 'Overview', LucideIcons.layoutDashboard, const DashboardScreen()),
          _buildItem(context, 'Shopping Lists', LucideIcons.shoppingCart, const ShoppingListsScreen()),
          _buildItem(context, 'Master Items', LucideIcons.box, const MasterItemsScreen()),
          _buildItem(context, 'Categories', LucideIcons.tags, const CategoriesScreen()),
          _buildItem(context, 'Purchase History', LucideIcons.history, const PurchaseHistoryScreen()),
          const Divider(color: Colors.white10),
          ListTile(
            leading: const Icon(LucideIcons.logOut, color: Colors.redAccent),
            title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
            onTap: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('token');
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildItem(BuildContext context, String title, IconData icon, Widget screen) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey),
      title: Text(title, style: const TextStyle(color: Colors.white70)),
      onTap: () {
        Navigator.pop(context); // close drawer navigation
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => screen));
      },
    );
  }
}
