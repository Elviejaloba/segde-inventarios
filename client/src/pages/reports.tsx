import { ReportsView } from "@/components/reports-view";
import { Layout } from "@/components/layout";

export default function Reports() {
  return (
    <Layout hideImport hideBranchSelector>
      <div className="container mx-auto py-6">
        <ReportsView />
      </div>
    </Layout>
  );
}