import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSeasonStore } from "@/lib/store";
import { storage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Plus, ArrowRight, Archive, Activity, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const SEASON_CODES_TEMPORADA_VERANO = [
  'TA001', 'TA002', 'TA003', 'TA004', 'TA005', 'TA006', 'TA007', 'TA008', 'TA009', 'TA010',
  'TA011', 'TA012', 'TA013', 'TA014', 'TA015', 'TA016', 'TA017', 'TA018', 'TA019', 'TA020',
  'TA021', 'TA022', 'TA023', 'TA024', 'TA025', 'TA026', 'TA027', 'TA028', 'TA029', 'TA030',
  'TA031', 'TA032', 'TA033', 'TA034', 'TA035', 'TA036', 'TA037', 'TA038', 'TA039', 'TA040',
  'TV001', 'TV002', 'TV003', 'TV004', 'TV005', 'TV006', 'TV007', 'TV008', 'TV009', 'TV010',
  'TV011', 'TV012', 'TV013', 'TV014', 'TV015', 'TV016', 'TV017', 'TV018', 'TV019', 'TV020',
  'TV021', 'TV022', 'TV023', 'TV024', 'TV025', 'TV026', 'TV027', 'TV028', 'TV029', 'TV030',
  'TV031', 'TV032', 'TV033', 'TV034', 'TV035', 'TV036', 'TV037', 'TV038', 'TV039', 'TV040', 'TV041'
];

const AVAILABLE_SEASONS = [
  {
    id: 'temporada-verano' as const,
    name: 'Temporada Verano',
    description: 'Temporada de productos de verano con 81 códigos específicos (TA001-TA040, TV001-TV041)',
    codes: SEASON_CODES_TEMPORADA_VERANO,
    color: 'bg-orange-500/10 text-orange-700 border-orange-200',
    icon: '☀️'
  }
];

export function SeasonManager() {
  const { currentSeason, setCurrentSeason } = useSeasonStore();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializeSeason = async (seasonId: typeof currentSeason) => {
    setLoading(true);
    try {
      const season = AVAILABLE_SEASONS.find(s => s.id === seasonId);
      if (!season) throw new Error('Temporada no encontrada');

      await storage.initializeSeasonData(seasonId, season.codes);
      setCurrentSeason(seasonId);
      
      toast({
        title: "Temporada inicializada",
        description: `${season.name} está lista para usar con ${season.codes.length} códigos.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error al inicializar temporada:', error);
      toast({
        title: "Error al inicializar",
        description: "No se pudo inicializar la temporada. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchSeason = async (seasonId: typeof currentSeason) => {
    setLoading(true);
    try {
      setCurrentSeason(seasonId);
      toast({
        title: "Temporada cambiada",
        description: `Ahora trabajando en ${AVAILABLE_SEASONS.find(s => s.id === seasonId)?.name}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error al cambiar temporada:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de temporada.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Gestión de Temporadas</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Sistema de versionado estacional que permite gestionar diferentes conjuntos de códigos de productos 
          manteniendo el historial de datos previos.
        </p>
      </div>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Temporada Actual
          </CardTitle>
          <CardDescription>
            Temporada activa para nuevos registros y seguimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSeason ? (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {AVAILABLE_SEASONS.find(s => s.id === currentSeason)?.icon}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {AVAILABLE_SEASONS.find(s => s.id === currentSeason)?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {AVAILABLE_SEASONS.find(s => s.id === currentSeason)?.codes.length} códigos de productos
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">
                Activa
              </Badge>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay temporada activa</p>
              <p className="text-sm">Selecciona una temporada para comenzar</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold mb-2">Temporadas Disponibles</h2>
        {AVAILABLE_SEASONS.map((season) => {
          const isActive = currentSeason === season.id;
          
          return (
            <motion.div
              key={season.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`transition-all duration-200 hover:shadow-md ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{season.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {season.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={season.color}>
                      {season.codes.length} códigos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="text-sm text-muted-foreground">
                      Códigos: {season.codes.slice(0, 5).join(', ')}
                      {season.codes.length > 5 && ` y ${season.codes.length - 5} más...`}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!isActive ? (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="default" disabled={loading} className="gap-2">
                              <Plus className="h-4 w-4" />
                              Inicializar Temporada
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Inicializar {season.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción creará una nueva temporada con {season.codes.length} códigos de productos. 
                                Los datos anteriores se mantendrán archivados y accesibles.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => initializeSeason(season.id)}>
                                Inicializar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        {currentSeason && currentSeason !== season.id && (
                          <Button variant="outline" onClick={() => switchSeason(season.id)} disabled={loading} className="gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Cambiar a esta temporada
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Activity className="h-4 w-4 text-green-500" />
                        Temporada activa - Los nuevos datos se guardarán aquí
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Sistema de Versionado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <ul className="space-y-2 text-sm">
            <li>• Cada temporada mantiene sus propios códigos y datos</li>
            <li>• Los datos históricos se conservan y pueden consultarse</li>
            <li>• El cambio entre temporadas es instantáneo</li>
            <li>• Los reportes pueden generarse por temporada específica</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}