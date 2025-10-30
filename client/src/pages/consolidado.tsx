import { useState, useEffect } from "react";
import { firestore } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Package, AlertTriangle } from "lucide-react";
import type { BranchSummary } from "@shared/schema";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

export default function Consolidado() {
  const [branchSummaries, setBranchSummaries] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalPhysical: 0,
    totalTheoretical: 0,
    totalDifference: 0,
    differencePct: 0,
    totalCaptures: 0,
    totalComprobantes: 0
  });

  useEffect(() => {
    const fetchBranchSummaries = async () => {
      try {
        const summariesSnapshot = await getDocs(collection(firestore, "branch_summaries"));
        const summaries: BranchSummary[] = [];
        
        let totalPhysical = 0;
        let totalTheoretical = 0;
        let totalDifference = 0;
        let totalCaptures = 0;
        let totalComprobantes = 0;

        summariesSnapshot.forEach((doc) => {
          const data = doc.data() as BranchSummary;
          summaries.push(data);
          totalPhysical += data.totalPhysical;
          totalTheoretical += data.totalTheoretical;
          totalDifference += data.totalDifference;
          totalCaptures += data.capturesCount;
          totalComprobantes += data.comprobantesProcessed;
        });

        const differencePct = totalTheoretical !== 0 ? (totalDifference / totalTheoretical) * 100 : 0;

        setBranchSummaries(summaries.sort((a, b) => Math.abs(b.differencePct) - Math.abs(a.differencePct)));
        setGlobalStats({
          totalPhysical,
          totalTheoretical,
          totalDifference,
          differencePct,
          totalCaptures,
          totalComprobantes
        });
      } catch (error) {
        console.error("Error cargando consolidado:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranchSummaries();
  }, []);

  const pieData = branchSummaries.map((branch) => ({
    name: branch.sucursal,
    value: Math.abs(branch.totalDifference)
  }));

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Cargando consolidado...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Consolidado Multi-Sucursal</h1>
        <p className="text-muted-foreground mt-2">
          Análisis consolidado de inventario de todas las sucursales
        </p>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Físico Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="global-kpi-physical">
              {globalStats.totalPhysical.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Teórico Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="global-kpi-theoretical">
              {globalStats.totalTheoretical.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Diferencia Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${globalStats.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="global-kpi-difference">
                {globalStats.totalDifference.toLocaleString()}
              </div>
              {globalStats.totalDifference >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% Diferencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalStats.differencePct >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="global-kpi-percentage">
              {globalStats.differencePct.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tomas Procesadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold" data-testid="global-kpi-captures">
                {globalStats.totalCaptures}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comprobantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div className="text-2xl font-bold" data-testid="global-kpi-comprobantes">
                {globalStats.totalComprobantes}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras comparativo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparación por Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={branchSummaries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sucursal" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalPhysical" fill="#10b981" name="Físico" />
                <Bar dataKey="totalTheoretical" fill="#3b82f6" name="Teórico" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de torta de diferencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Distribución de Diferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada por sucursal */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Sucursal</CardTitle>
          <CardDescription>
            Análisis consolidado de {branchSummaries.length} sucursales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Stock Físico</TableHead>
                  <TableHead className="text-right">Stock Teórico</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="text-right">% Diferencia</TableHead>
                  <TableHead className="text-right">Tomas</TableHead>
                  <TableHead className="text-right">Comprobantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchSummaries.map((branch, idx) => (
                  <TableRow key={idx} data-testid={`row-branch-${idx}`}>
                    <TableCell className="font-medium">{branch.sucursal}</TableCell>
                    <TableCell className="text-right">{branch.totalPhysical.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{branch.totalTheoretical.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${branch.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branch.totalDifference.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${branch.differencePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branch.differencePct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">{branch.capturesCount}</TableCell>
                    <TableCell className="text-right">{branch.comprobantesProcessed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {branchSummaries.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos disponibles</p>
              <p className="text-sm mt-2">Sube archivos de inventario para ver el consolidado</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
