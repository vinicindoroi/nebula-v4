import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GitFork, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFunnel: (data: { name: string; description?: string; funnel_type?: string }) => void;
  isLoading?: boolean;
}

export function NewFunnelDialog({
  open,
  onOpenChange,
  onCreateFunnel,
  isLoading,
}: NewFunnelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [funnelType, setFunnelType] = useState('funnelytics');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateFunnel({ name: name.trim(), description: description.trim() || undefined, funnel_type: funnelType });
    setName('');
    setDescription('');
    setFunnelType('funnelytics');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Funil</DialogTitle>
          <DialogDescription>
            Crie um novo funil de vendas para mapear sua estratégia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Funil</Label>
            <RadioGroup value={funnelType} onValueChange={setFunnelType} className="grid grid-cols-2 gap-3">
              <label
                htmlFor="type-funnelytics"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                  funnelType === 'funnelytics'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <RadioGroupItem value="funnelytics" id="type-funnelytics" className="sr-only" />
                <GitFork className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Funnelytics</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">Construção visual de funis</span>
              </label>

              <label
                htmlFor="type-mind"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors relative",
                  funnelType === 'mind'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <RadioGroupItem value="mind" id="type-mind" className="sr-only" />
                <Brain className={cn("h-6 w-6", funnelType === 'mind' ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium text-muted-foreground">Mind Map</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">Mapa mental de funis</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-name">Nome do Funil</Label>
            <Input
              id="funnel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Funil de Lançamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-description">Descrição (opcional)</Label>
            <Textarea
              id="funnel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste funil..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Criando...' : 'Criar Funil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}