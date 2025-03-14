import { useMemo } from "react";
import { collection, doc, updateDoc } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Code, codeSchema, ChecklistItem, Branch } from "@shared/schema";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface ChecklistProps {
  branch: Branch;
}

export function Checklist({ branch }: ChecklistProps) {
  const { toast } = useToast();
  const [snapshot, loading, error] = useCollection(
    collection(db, "branches", branch, "items")
  );

  const items = useMemo(() => {
    if (!snapshot) return {} as Record<Code, ChecklistItem>;
    return snapshot.docs.reduce((acc, doc) => {
      const data = doc.data() as ChecklistItem;
      acc[doc.id as Code] = data;
      return acc;
    }, {} as Record<Code, ChecklistItem>);
  }, [snapshot]);

  const progress = useMemo(() => {
    if (!items) return { completed: 0, communicated: 0 };
    const total = Object.keys(codeSchema.enum).length;
    const completed = Object.values(items).filter(i => i?.completed).length;
    const communicated = Object.values(items).filter(i => i?.communicated).length;
    return {
      completed: (completed / total) * 100,
      communicated: (communicated / total) * 100
    };
  }, [items]);

  const handleUpdate = async (code: Code, field: 'completed' | 'communicated') => {
    if (!auth.currentUser) return;

    try {
      const ref = doc(db, "branches", branch, "items", code);
      await updateDoc(ref, {
        [field]: !items[code]?.[field],
        updatedAt: Date.now(),
        updatedBy: auth.currentUser.email
      });
    } catch (err) {
      toast({
        title: "Error updating item",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading checklist...</div>;
  }

  if (error) {
    return <div>Error loading checklist: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Progress</h3>
        <Progress value={progress.completed} className="mb-2" />
        <div className="text-sm text-muted-foreground">
          {progress.completed.toFixed(0)}% completed
        </div>
        <Progress value={progress.communicated} />
        <div className="text-sm text-muted-foreground">
          {progress.communicated.toFixed(0)}% communicated
        </div>
      </div>

      <div className="space-y-4">
        {Object.values(codeSchema.enum).map((code) => (
          <div key={code} className="flex items-center gap-4 p-2 rounded hover:bg-accent">
            <span className="flex-1 font-mono">{code}</span>
            <Checkbox
              checked={items[code]?.completed || false}
              onCheckedChange={() => handleUpdate(code, 'completed')}
            />
            <Checkbox 
              checked={items[code]?.communicated || false}
              onCheckedChange={() => handleUpdate(code, 'communicated')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}