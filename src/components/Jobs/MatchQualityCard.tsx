import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, BookOpen, TrendingUp, Info } from "lucide-react";

interface MatchBreakdown {
  skills?: number;
  seniority?: number;
  domain?: number;
  semantic?: number;
}

interface MatchQualityCardProps {
  score: number;
  breakdown?: MatchBreakdown;
  reasoning?: string;
  loading?: boolean;
}

export const MatchQualityCard = ({ 
  score, 
  breakdown = {}, 
  reasoning, 
  loading = false 
}: MatchQualityCardProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const signals = [
    { label: 'Technical Alignment', value: breakdown.skills || 0, icon: Zap, weight: '40%' },
    { label: 'Experience Match', value: breakdown.seniority || 0, icon: TrendingUp, weight: '30%' },
    { label: 'Domain Relevance', value: breakdown.domain || 0, icon: Target, weight: '20%' },
    { label: 'Contextual Fit', value: breakdown.semantic || 0, icon: BookOpen, weight: '10%' },
  ].filter(s => s.value > 0);

  if (loading) {
    return (
      <Card className="border-dashed border-2 animate-pulse">
        <CardContent className="p-6 h-32 flex items-center justify-center">
          <p className="text-muted-foreground">AI is calculating your fit...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 flex items-center justify-center">
          <svg className="h-full w-full" viewBox="0 0 36 36">
            <path
              className="text-muted stroke-current"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${getScoreColor(score)} stroke-current transition-all duration-1000 ease-out`}
              strokeWidth="3"
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className={`absolute text-xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold bg-primary/5 border-primary/20">
              AI Insight
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80 italic">
            "{reasoning || "Analyzing candidate compatibility across multiple signals..."}"
          </p>
        </div>
      </div>

      {signals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-2 border-t border-border/40">
          {signals.map((signal) => (
            <div key={signal.label} className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                <div className="flex items-center gap-1.5">
                  <signal.icon className="h-3 w-3" />
                  {signal.label}
                </div>
                <span>{signal.value}%</span>
              </div>
              <Progress value={signal.value} className="h-1 bg-muted/30" />
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-md border border-primary/10">
        <Info className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] text-primary/80 font-medium italic">
          Match is computed using semantic embeddings, direct skill overlap, and AI reasoning.
        </span>
      </div>
    </div>
  );
};
