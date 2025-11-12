import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Bell, BellOff, CheckCircle2, AlertTriangle, Settings } from "lucide-react";
import { scoreNightQuality, type ObservingConditions } from "./NightQualityScorer";

interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface MeteoForecast {
  id: number;
  ts: string;
  cloudPct: number;
  transparencyIdx: number | null;
  seeingArcsec: number | null;
  windMps: number;
  tempC: number;
  dewpointC: number;
  rhPct: number;
  moonIllum: number;
  moonAltDeg: number;
}

interface AlertPreferences {
  enabled: boolean;
  siteId: string;
  targetType: "deep_sky" | "planetary" | "lunar" | "solar";
  minQualityScore: number;
  checkInterval: number; // minutes
  notifyBrowser: boolean;
  notifyInApp: boolean;
}

interface Alert {
  id: string;
  timestamp: Date;
  siteId: string;
  siteName: string;
  score: number;
  message: string;
  conditions: ObservingConditions;
  read: boolean;
}

export function ConditionAlerts() {
  const [preferences, setPreferences] = useState<AlertPreferences>({
    enabled: false,
    siteId: "",
    targetType: "deep_sky",
    minQualityScore: 75,
    checkInterval: 30,
    notifyBrowser: true,
    notifyInApp: true,
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [showSettings, setShowSettings] = useState(false);

  // Fetch sites
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/ops/sites"],
    queryFn: async () => {
      const res = await fetch("/astrodb/v1/ops/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch weather for monitored site
  const { data: forecast } = useQuery<MeteoForecast[]>({
    queryKey: ["/api/ops/weather-alert", preferences.siteId],
    queryFn: async () => {
      if (!preferences.siteId || !preferences.enabled) return [];

      const now = new Date();
      const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        from: now.toISOString(),
        to: end.toISOString(),
      });

      const res = await fetch(`/astrodb/v1/ops/weather/${preferences.siteId}?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: preferences.enabled && !!preferences.siteId,
    refetchInterval: preferences.checkInterval * 60 * 1000,
  });

  // Auto-select first site
  useEffect(() => {
    if (sites && sites.length > 0 && !preferences.siteId) {
      setPreferences(prev => ({ ...prev, siteId: sites[0].id }));
    }
  }, [sites, preferences.siteId]);

  // Request notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("conditionAlertPreferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
      } catch (e) {
        console.error("Failed to load alert preferences", e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("conditionAlertPreferences", JSON.stringify(preferences));
  }, [preferences]);

  // Load alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("conditionAlerts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAlerts(parsed.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })));
      } catch (e) {
        console.error("Failed to load alerts", e);
      }
    }
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem("conditionAlerts", JSON.stringify(alerts));
  }, [alerts]);

  // Check conditions and trigger alerts
  useEffect(() => {
    if (!forecast || forecast.length === 0 || !preferences.enabled) return;

    const now = new Date();
    const upcomingForecasts = forecast.filter(f => {
      const forecastTime = new Date(f.ts);
      return forecastTime.getTime() > now.getTime();
    });

    if (upcomingForecasts.length === 0) return;

    // Check next few hours
    const nextThreeHours = upcomingForecasts.slice(0, 3);

    for (const f of nextThreeHours) {
      const conditions: ObservingConditions = {
        cloudPct: f.cloudPct,
        transparencyIdx: f.transparencyIdx ?? undefined,
        seeingArcsec: f.seeingArcsec ?? undefined,
        windMps: f.windMps,
        dewMarginC: f.tempC - f.dewpointC,
        moonIllum: f.moonIllum,
        moonAltDeg: f.moonAltDeg,
        ts: f.ts,
      };

      const score = scoreNightQuality(conditions, preferences.targetType);

      // Check if score meets threshold
      if (score.totalScore >= preferences.minQualityScore) {
        const forecastTime = new Date(f.ts);
        const alertId = `${preferences.siteId}-${f.ts}`;

        // Check if we already have this alert
        const existingAlert = alerts.find(a => a.id === alertId);
        if (existingAlert) continue;

        const site = sites?.find(s => s.id === preferences.siteId);
        const siteName = site?.name || "Unknown Site";

        const hoursFromNow = Math.round((forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        const timeDescription = hoursFromNow === 0 ? "now" : `in ${hoursFromNow}h`;

        const newAlert: Alert = {
          id: alertId,
          timestamp: now,
          siteId: preferences.siteId,
          siteName,
          score: score.totalScore,
          message: `${score.grade} conditions ${timeDescription} at ${siteName} (score: ${score.totalScore})`,
          conditions,
          read: false,
        };

        setAlerts(prev => [newAlert, ...prev].slice(0, 20)); // Keep last 20 alerts

        // Show browser notification
        if (preferences.notifyBrowser && notificationPermission === "granted") {
          new Notification("Excellent Observing Conditions!", {
            body: newAlert.message,
            icon: "/favicon.ico",
            tag: alertId,
          });
        }
      }
    }
  }, [forecast, preferences, sites, alerts, notificationPermission]);

  const toggleAlert = () => {
    if (!preferences.enabled && preferences.notifyBrowser && notificationPermission === "default") {
      requestNotificationPermission();
    }
    setPreferences(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
  };

  const clearAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {preferences.enabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                Condition Alerts
              </CardTitle>
              <CardDescription>
                Get notified when excellent observing conditions are forecast
              </CardDescription>
            </div>
            <Button
              onClick={toggleAlert}
              variant={preferences.enabled ? "default" : "outline"}
              className="gap-2"
            >
              {preferences.enabled ? (
                <>
                  <Bell className="w-4 h-4" />
                  Alerts On
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  Alerts Off
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Alert Settings</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {showSettings ? "Hide" : "Show"}
              </Button>
            </div>

            {showSettings && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                {/* Site Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Monitor Site</Label>
                  <Select
                    value={preferences.siteId}
                    onValueChange={(value) =>
                      setPreferences(prev => ({ ...prev, siteId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites?.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Type */}
                <div className="space-y-2">
                  <Label className="text-sm">Target Type</Label>
                  <Select
                    value={preferences.targetType}
                    onValueChange={(value: any) =>
                      setPreferences(prev => ({ ...prev, targetType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deep_sky">Deep Sky</SelectItem>
                      <SelectItem value="planetary">Planetary</SelectItem>
                      <SelectItem value="lunar">Lunar</SelectItem>
                      <SelectItem value="solar">Solar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Minimum Quality Score */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Minimum Quality Score: {preferences.minQualityScore}
                  </Label>
                  <Slider
                    value={[preferences.minQualityScore]}
                    onValueChange={([value]) =>
                      setPreferences(prev => ({ ...prev, minQualityScore: value }))
                    }
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when conditions score {preferences.minQualityScore} or higher
                  </p>
                </div>

                {/* Check Interval */}
                <div className="space-y-2">
                  <Label className="text-sm">Check Every</Label>
                  <Select
                    value={preferences.checkInterval.toString()}
                    onValueChange={(value) =>
                      setPreferences(prev => ({ ...prev, checkInterval: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Options */}
                <div className="space-y-3">
                  <Label className="text-sm">Notification Methods</Label>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal">Browser Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Send desktop notifications
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifyBrowser}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, notifyBrowser: checked }))
                      }
                    />
                  </div>

                  {preferences.notifyBrowser && notificationPermission !== "granted" && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Notification permission required
                        </p>
                      </div>
                      <Button
                        onClick={requestNotificationPermission}
                        size="sm"
                        variant="outline"
                        className="mt-2"
                      >
                        Grant Permission
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal">In-App Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Show alerts in this panel
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifyInApp}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, notifyInApp: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          {preferences.enabled && (
            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Monitoring Active</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Checking {sites?.find(s => s.id === preferences.siteId)?.name || "selected site"} every{" "}
                    {preferences.checkInterval} minutes for {preferences.targetType.replace("_", " ")} conditions
                    scoring {preferences.minQualityScore}+
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts List */}
          {preferences.notifyInApp && alerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Recent Alerts
                  {unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {unreadCount} new
                    </Badge>
                  )}
                </Label>
                {alerts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAlerts}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      alert.read ? "bg-muted/30" : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              alert.score >= 85
                                ? "bg-green-500 text-white"
                                : alert.score >= 70
                                ? "bg-blue-500 text-white"
                                : "bg-yellow-500 text-black"
                            }
                          >
                            Score: {alert.score}
                          </Badge>
                          <span className="text-sm font-medium">{alert.siteName}</span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!alert.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                            className="h-8 px-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearAlert(alert.id)}
                          className="h-8 px-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preferences.notifyInApp && alerts.length === 0 && preferences.enabled && (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No alerts yet</p>
              <p className="text-sm">You'll be notified when excellent conditions are forecast</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
