import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { Boxes } from 'lucide-react';
import InventoryManagement from '@/pages/operations/InventoryManagement';

export default function Inventory() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <InventoryManagement />
      </div>
    </DashboardLayout>
  );
}
