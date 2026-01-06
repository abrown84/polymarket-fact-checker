/**
 * Formatting utilities for displaying data consistently
 */

export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined || isNaN(volume)) {
    return "$0";
  }
  
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(1)}B`;
  }
  if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(1)}M`;
  }
  if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) {
    return "—";
  }
  return `${(price * 100).toFixed(0)}%`;
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp)) {
    return "Unknown date";
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    // Show relative time for recent items
    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return minutes <= 0 ? "Just now" : `${minutes}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }
    
    // Show full date for older items
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Invalid date";
  }
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString();
}

export function formatPercentage(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split(".");
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined && result !== null ? result : defaultValue;
}





