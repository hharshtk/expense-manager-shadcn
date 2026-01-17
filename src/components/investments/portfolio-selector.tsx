"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronDown, 
  Plus, 
  FolderOpen,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { createPortfolio, updatePortfolio, deletePortfolio, assignToPortfolio } from "@/actions/investments";
import { toast } from "sonner";
import type { Portfolio, Investment } from "@/lib/schema";

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedPortfolioId: number | null;
  onPortfolioChange: (portfolioId: number | null) => void;
  showCreateOnly?: boolean;
}

export function PortfolioSelector({ 
  portfolios, 
  selectedPortfolioId, 
  onPortfolioChange,
  showCreateOnly = false,
}: PortfolioSelectorProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Portfolio name is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createPortfolio({ name, description });
      if (result.success) {
        toast.success("Portfolio created");
        setCreateDialogOpen(false);
        setName("");
        setDescription("");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to create portfolio");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingPortfolio || !name.trim()) return;

    setLoading(true);
    try {
      const result = await updatePortfolio(editingPortfolio.id, { name, description });
      if (result.success) {
        toast.success("Portfolio updated");
        setEditDialogOpen(false);
        setEditingPortfolio(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update portfolio");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (portfolio: Portfolio) => {
    if (!confirm(`Are you sure you want to delete "${portfolio.name}"?`)) return;

    const result = await deletePortfolio(portfolio.id);
    if (result.success) {
      toast.success("Portfolio deleted");
      if (selectedPortfolioId === portfolio.id) {
        onPortfolioChange(null);
      }
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete portfolio");
    }
  };

  const openEditDialog = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setName(portfolio.name);
    setDescription(portfolio.description || "");
    setEditDialogOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Show only Create button when showCreateOnly is true */}
      {showCreateOnly ? (
        <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Portfolio
        </Button>
      ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>{selectedPortfolio?.name || "All Portfolios"}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuItem onClick={() => onPortfolioChange(null)}>
            <div className="flex items-center justify-between w-full">
              <span>All Portfolios</span>
              {selectedPortfolioId === null && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {portfolios.map((portfolio) => (
            <DropdownMenuItem
              key={portfolio.id}
              className="flex items-center justify-between"
            >
              <span 
                className="flex-1 cursor-pointer"
                onClick={() => onPortfolioChange(portfolio.id)}
              >
                {portfolio.name}
              </span>
              <div className="flex items-center gap-1">
                {selectedPortfolioId === portfolio.id && (
                  <Check className="h-4 w-4 mr-1" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(portfolio);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(portfolio);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          {portfolios.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">No portfolios yet</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Portfolio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
            <DialogDescription>
              Create a new portfolio to organize your investments (e.g., "US Stocks", "Indian Stocks", "Retirement")
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., US Stocks, Indian Stocks, Retirement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this portfolio"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update portfolio details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Portfolio name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type InvestmentDialogItem = {
  id: number;
  symbol: string;
  name: string;
  type: string;
  exchange?: string | null;
  currentPrice: number | string | null;
  totalQuantity: number | string | null;
  averagePrice: number | string | null;
  portfolioId: number | null;
  currency?: string | null;
};

interface AssignPortfolioDialogProps {
  investment: InvestmentDialogItem;
  portfolios: Portfolio[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignPortfolioDialog({
  investment,
  portfolios,
  open,
  onOpenChange,
}: AssignPortfolioDialogProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(
    investment.portfolioId?.toString() || "none"
  );
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    setLoading(true);
    try {
      const portfolioId = selectedPortfolioId === "none" ? null : parseInt(selectedPortfolioId);
      const result = await assignToPortfolio(investment.id, portfolioId);
      if (result.success) {
        toast.success("Investment assigned to portfolio");
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to assign portfolio");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Portfolio</DialogTitle>
          <DialogDescription>
            Move {investment.symbol} to a portfolio
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label>Portfolio</Label>
          <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a portfolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Portfolio</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id.toString()}>
                  {portfolio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
