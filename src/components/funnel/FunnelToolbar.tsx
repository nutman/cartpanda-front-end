import { useState, useRef, useEffect } from 'react';
import { Download, Upload, Trash2, AlertCircle, ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FunnelToolbarProps {
  onExport: () => string;
  onImport: (json: string) => boolean;
  onClear: () => void;
  validationErrors: string[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function FunnelToolbar({
  onExport,
  onImport,
  onClear,
  validationErrors,
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: FunnelToolbarProps) {
  const [importJson, setImportJson] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          onRedo();
        } else {
          e.preventDefault();
          onUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'funnel.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Funnel exported',
      description: 'Your funnel has been downloaded as JSON.',
    });
  };

  const handleImport = () => {
    const success = onImport(importJson);
    if (success) {
      toast({
        title: 'Funnel imported',
        description: 'Your funnel has been loaded successfully.',
      });
      setImportDialogOpen(false);
      setImportJson('');
    } else {
      toast({
        title: 'Import failed',
        description: 'Invalid JSON format. Please check your file.',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportJson(content);
      };
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
    onClear();
    setClearDialogOpen(false);
    toast({
      title: 'Funnel cleared',
      description: 'All nodes and connections have been removed.',
    });
  };

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {/* Undo/Redo controls */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onUndo} 
                disabled={!canUndo}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRedo} 
                disabled={!canRedo}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-md">
          <Button variant="ghost" size="sm" onClick={onZoomOut} className="h-8 w-8 p-0">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onZoomIn} className="h-8 w-8 p-0">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onFitView} className="h-8 w-8 p-0">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="bg-card shadow-md gap-2 text-warning border-warning/30 hover:bg-warning/10">
              <AlertCircle className="h-4 w-4" />
              {validationErrors.length} {validationErrors.length === 1 ? 'Issue' : 'Issues'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Validation Issues</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Export button */}
      <Button variant="outline" size="sm" onClick={handleExport} className="bg-card shadow-md gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>

      {/* Import button */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="bg-card shadow-md gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Funnel</DialogTitle>
            <DialogDescription>
              Paste your funnel JSON or upload a file. This will replace your current funnel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <Textarea
              placeholder="Or paste JSON here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear button */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="bg-card shadow-md gap-2 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Funnel</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all nodes and connections? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
