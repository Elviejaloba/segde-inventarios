import { useCollectionData } from "react-firebase-hooks/firestore";
import { collection, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BranchData, Branch, branchSchema } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function Dashboard() {
  const [branchesData, loading, error] = useCollectionData(
    query(collection(db, "branches"))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  const sortedBranches = Object.values(branchSchema.enum)
    .map(branch => {
      const branchDoc = branchesData?.find(d => d.id === branch);
      return {
        branch,
        data: {
          totalCompleted: branchDoc?.totalCompleted || 0,
          totalCommunicated: branchDoc?.totalCommunicated || 0
        }
      };
    })
    .sort((a, b) => b.data.totalCompleted - a.data.totalCompleted);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="text-right">Communicated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBranches.map(({ branch, data }) => (
            <TableRow key={branch}>
              <TableCell className="font-medium">{branch}</TableCell>
              <TableCell className="text-right">{data.totalCompleted}</TableCell>
              <TableCell className="text-right">{data.totalCommunicated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}