import { useState } from "react";
import { Branch } from "@/lib/store";
import { BranchSelector } from "@/components/branch-selector";
import { Share, ArrowLeft, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function Home() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <LineChart className="h-6 w-6" />
        Ranking de Sucursales
      </h2>
      <Dashboard />
    </div>
  );
}