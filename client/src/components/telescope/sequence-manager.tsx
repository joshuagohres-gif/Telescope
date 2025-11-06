import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Pause, Square, Trash2, Edit, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ImagingSequence, CelestialTarget } from "@shared/schema";

const sequenceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetName: z.string().min(1, "Target is required"),
  ra: z.coerce.number().min(0).max(24),
  dec: z.coerce.number().min(-90).max(90),
  totalFrames: z.coerce.number().min(1).max(1000),
  estimatedDuration: z.coerce.number().min(1),
});

const frameFormSchema = z.object({
  frameType: z.enum(["light", "dark", "bias", "flat"]),
  filter: z.enum(["L", "R", "G", "B", "Ha", "OIII", "SII"]),
  exposureTime: z.coerce.number().min(0.001).max(3600),
  gain: z.coerce.number().min(0).max(100),
  binning: z.enum(["1", "2", "3", "4"]),
  count: z.coerce.number().min(1).max(1000),
  dither: z.boolean(),
});

export function SequenceManager() {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [frameDialogOpen, setFrameDialogOpen] = useState(false);

  const { data: sequences, isLoading } = useQuery<ImagingSequence[]>({
    queryKey: ["/api/sequences"],
  });

  const { data: targets } = useQuery<CelestialTarget[]>({
    queryKey: ["/api/targets"],
  });

  const { data: activeSequence } = useQuery<{
    sequenceId: string;
    name: string;
    targetName: string;
    status: string;
    completedFrames: number;
    totalFrames: number;
    estimatedDuration: number;
    currentFrame: number;
  } | null>({
    queryKey: ["/api/sequences/active"],
    refetchInterval: 2000,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/sequences/active");
      if (response.status === 404) {
        return null; // No active sequence
      }
      if (!response.ok) {
        throw new Error("Failed to fetch active sequence");
      }
      return response.json();
    },
  });

  const sequenceForm = useForm({
    resolver: zodResolver(sequenceFormSchema),
    defaultValues: {
      name: "",
      targetName: "",
      ra: "0" as any,
      dec: "0" as any,
      totalFrames: "10" as any,
      estimatedDuration: "600" as any,
    },
  });

  const frameForm = useForm({
    resolver: zodResolver(frameFormSchema),
    defaultValues: {
      frameType: "light" as const,
      filter: "L" as const,
      exposureTime: "60" as any,
      gain: "50" as any,
      binning: "1" as const,
      count: "10" as any,
      dither: false,
    },
  });

  const createSequenceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sequenceFormSchema>) => {
      return await apiRequest("/api/sequences", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          status: "pending",
          completedFrames: 0,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      setCreateDialogOpen(false);
      setSelectedSequenceId(data.id);
      sequenceForm.reset();
      toast({
        title: "Sequence Created",
        description: "Imaging sequence has been created",
      });
    },
  });

  const addFrameMutation = useMutation({
    mutationFn: async ({ sequenceId, data }: { sequenceId: string; data: z.infer<typeof frameFormSchema> }) => {
      return await apiRequest(`/api/sequences/${sequenceId}/frames`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          binning: parseInt(data.binning),
          orderIndex: 0,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      setFrameDialogOpen(false);
      frameForm.reset();
      toast({
        title: "Frame Added",
        description: "Frame configuration has been added to sequence",
      });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (sequenceId: string) => {
      const response = await fetch(`/api/sequences/${sequenceId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to start sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/active"] });
      toast({
        title: "Sequence Started",
        description: "Imaging sequence is now running",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to Start",
        description: "Could not start imaging sequence",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sequences/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to pause sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/active"] });
      toast({
        title: "Sequence Paused",
        description: "Imaging sequence has been paused",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sequences/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to resume sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/active"] });
      toast({
        title: "Sequence Resumed",
        description: "Imaging sequence has resumed",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sequences/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to stop sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/active"] });
      toast({
        title: "Sequence Stopped",
        description: "Imaging sequence has been stopped",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sequenceId: string) => {
      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete sequence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      toast({
        title: "Sequence Deleted",
        description: "Imaging sequence has been removed",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      running: { variant: "default", label: "Running" },
      paused: { variant: "secondary", label: "Paused" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
      stopped: { variant: "secondary", label: "Stopped" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const onSequenceSubmit = (data: z.infer<typeof sequenceFormSchema>) => {
    createSequenceMutation.mutate(data);
  };

  const onFrameSubmit = (data: z.infer<typeof frameFormSchema>) => {
    if (selectedSequenceId) {
      addFrameMutation.mutate({ sequenceId: selectedSequenceId, data });
    }
  };

  const handleTargetSelect = (targetName: string) => {
    const target = targets?.find((t) => t.name === targetName);
    if (target) {
      sequenceForm.setValue("targetName", target.name);
      sequenceForm.setValue("ra", target.ra.toString());
      sequenceForm.setValue("dec", target.dec.toString());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground" data-testid="text-loading">Loading sequences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeSequence && activeSequence.sequenceId && (
        <Card data-testid="card-active-sequence">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Active Sequence
              </span>
              <div className="flex items-center gap-2">
                {activeSequence.status === "running" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pauseMutation.mutate()}
                    disabled={pauseMutation.isPending}
                    data-testid="button-pause-sequence"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                {activeSequence.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resumeMutation.mutate()}
                    disabled={resumeMutation.isPending}
                    data-testid="button-resume-sequence"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                  data-testid="button-stop-sequence"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" data-testid="text-sequence-name">{activeSequence.name}</span>
                {getStatusBadge(activeSequence.status)}
              </div>
              <Progress
                value={activeSequence.totalFrames ? ((activeSequence.completedFrames ?? 0) / activeSequence.totalFrames) * 100 : 0}
                data-testid="progress-sequence"
              />
              <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                <span data-testid="text-frame-progress">
                  Frame {activeSequence.completedFrames ?? 0} of {activeSequence.totalFrames ?? 0}
                </span>
                <span data-testid="text-progress-percentage">
                  {activeSequence.totalFrames ? Math.round(((activeSequence.completedFrames ?? 0) / activeSequence.totalFrames) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Target</div>
                <div className="font-medium font-mono" data-testid="text-target-name">{activeSequence.targetName ?? "Unknown"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-medium font-mono" data-testid="text-duration">
                  {formatDuration(activeSequence.estimatedDuration ?? 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-sequence-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Imaging Sequences</CardTitle>
              <CardDescription>Manage automated imaging sessions</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-sequence">
                  <Plus className="w-4 h-4 mr-2" />
                  New Sequence
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-sequence">
                <DialogHeader>
                  <DialogTitle>Create Imaging Sequence</DialogTitle>
                  <DialogDescription>
                    Create a new automated imaging sequence for your target
                  </DialogDescription>
                </DialogHeader>
                <Form {...sequenceForm}>
                  <form onSubmit={sequenceForm.handleSubmit(onSequenceSubmit)} className="space-y-4">
                    <FormField
                      control={sequenceForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sequence Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-sequence-name" placeholder="M31 LRGB Session" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sequenceForm.control}
                      name="targetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target</FormLabel>
                          <Select
                            onValueChange={handleTargetSelect}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-target">
                                <SelectValue placeholder="Select a target" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {targets?.map((target) => (
                                <SelectItem key={target.id} value={target.name} data-testid={`option-target-${target.name}`}>
                                  {target.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={sequenceForm.control}
                        name="totalFrames"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Frames</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                data-testid="input-total-frames"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={sequenceForm.control}
                        name="estimatedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Duration (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                data-testid="input-duration"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-sequence"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSequenceMutation.isPending} data-testid="button-submit-sequence">
                        Create Sequence
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!sequences || sequences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p data-testid="text-no-sequences">No imaging sequences yet</p>
              <p className="text-sm mt-1">Create your first automated imaging session</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.map((sequence) => (
                <Card
                  key={sequence.id}
                  className={`hover-elevate ${selectedSequenceId === sequence.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedSequenceId(sequence.id)}
                  data-testid={`card-sequence-${sequence.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate" data-testid={`text-sequence-name-${sequence.id}`}>
                            {sequence.name}
                          </h4>
                          {getStatusBadge(sequence.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-4 h-4" />
                            <span className="font-mono" data-testid={`text-target-${sequence.id}`}>
                              {sequence.targetName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span data-testid={`text-frames-${sequence.id}`}>
                              {sequence.completedFrames}/{sequence.totalFrames} frames
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {sequence.status === "pending" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startMutation.mutate(sequence.id);
                            }}
                            disabled={startMutation.isPending}
                            data-testid={`button-start-${sequence.id}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Dialog open={frameDialogOpen && selectedSequenceId === sequence.id} onOpenChange={setFrameDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSequenceId(sequence.id);
                                setFrameDialogOpen(true);
                              }}
                              data-testid={`button-add-frame-${sequence.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent data-testid="dialog-add-frame">
                            <DialogHeader>
                              <DialogTitle>Add Frame</DialogTitle>
                              <DialogDescription>
                                Add a frame configuration to this sequence
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...frameForm}>
                              <form onSubmit={frameForm.handleSubmit(onFrameSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={frameForm.control}
                                    name="frameType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Frame Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-frame-type">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="bias">Bias</SelectItem>
                                            <SelectItem value="flat">Flat</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={frameForm.control}
                                    name="filter"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Filter</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-filter">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="L">L (Luminance)</SelectItem>
                                            <SelectItem value="R">R (Red)</SelectItem>
                                            <SelectItem value="G">G (Green)</SelectItem>
                                            <SelectItem value="B">B (Blue)</SelectItem>
                                            <SelectItem value="Ha">Ha (Hydrogen Alpha)</SelectItem>
                                            <SelectItem value="OIII">OIII (Oxygen)</SelectItem>
                                            <SelectItem value="SII">SII (Sulfur)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={frameForm.control}
                                    name="exposureTime"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Exposure (sec)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            step="0.001"
                                            {...field}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            data-testid="input-exposure"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={frameForm.control}
                                    name="gain"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Gain</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            {...field}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            data-testid="input-gain"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={frameForm.control}
                                    name="binning"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Binning</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-binning">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="1">1x1</SelectItem>
                                            <SelectItem value="2">2x2</SelectItem>
                                            <SelectItem value="3">3x3</SelectItem>
                                            <SelectItem value="4">4x4</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={frameForm.control}
                                    name="count"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Count</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            {...field}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            data-testid="input-count"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFrameDialogOpen(false)}
                                    data-testid="button-cancel-frame"
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={addFrameMutation.isPending} data-testid="button-submit-frame">
                                    Add Frame
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(sequence.id);
                          }}
                          disabled={deleteMutation.isPending || sequence.status === "running"}
                          data-testid={`button-delete-${sequence.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
