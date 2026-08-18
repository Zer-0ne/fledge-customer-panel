'use client';

import * as React from 'react';
import { College, Campus } from '@/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, Filter, SlidersHorizontal } from 'lucide-react';

export interface RoommateFilterValues {
  locality?: string;
  collegeId?: string;
  campusId?: string;
  maxBudgetINR?: string;
  vegetarianOnly?: boolean;
  studentOnly?: boolean;
  nonSmokerOnly?: boolean;
}

export interface RoommateFiltersProps {
  colleges?: College[];
  campuses?: Campus[];
  initialValues?: RoommateFilterValues;
  onFilterChange: (filters: RoommateFilterValues) => void;
  onReset: () => void;
}

export function RoommateFilters({
  colleges = [],
  campuses = [],
  initialValues = {},
  onFilterChange,
  onReset,
}: RoommateFiltersProps) {
  const [locality, setLocality] = React.useState(initialValues.locality || '');
  const [collegeId, setCollegeId] = React.useState(initialValues.collegeId || '');
  const [campusId, setCampusId] = React.useState(initialValues.campusId || '');
  const [maxBudgetINR, setMaxBudgetINR] = React.useState(initialValues.maxBudgetINR || '');
  const [vegetarianOnly, setVegetarianOnly] = React.useState(!!initialValues.vegetarianOnly);
  const [studentOnly, setStudentOnly] = React.useState(!!initialValues.studentOnly);
  const [nonSmokerOnly, setNonSmokerOnly] = React.useState(!!initialValues.nonSmokerOnly);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const availableCampuses = React.useMemo(() => {
    if (!collegeId) return campuses;
    return campuses.filter((c) => c.collegeId === collegeId);
  }, [campuses, collegeId]);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange({
      locality: locality.trim() || undefined,
      collegeId: collegeId || undefined,
      campusId: campusId || undefined,
      maxBudgetINR: maxBudgetINR || undefined,
      vegetarianOnly,
      studentOnly,
      nonSmokerOnly,
    });
  };

  const handleResetClick = () => {
    setLocality('');
    setCollegeId('');
    setCampusId('');
    setMaxBudgetINR('');
    setVegetarianOnly(false);
    setStudentOnly(false);
    setNonSmokerOnly(false);
    onReset();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs space-y-4">
      {/* Search Bar Row */}
      <form onSubmit={handleApply} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by locality, area, or college..."
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="default" className="rounded-xl px-5 gap-1.5 font-medium">
            <Filter className="size-4" />
            Find Roommates
          </Button>

          <Button
            type="button"
            variant="outline"
            size="default"
            className="rounded-xl gap-1.5 sm:hidden"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
        </div>
      </form>

      {/* Advanced Filters (Always visible on desktop, toggleable on mobile) */}
      <div className={`space-y-4 pt-2 border-t border-border/40 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* College Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">College</label>
            <Select
              value={collegeId}
              onChange={(e) => {
                setCollegeId(e.target.value);
                setCampusId('');
              }}
              className="rounded-xl"
            >
              <option value="">All Colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Campus Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Campus</label>
            <Select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              disabled={availableCampuses.length === 0}
              className="rounded-xl"
            >
              <option value="">All Campuses</option>
              {availableCampuses.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Max Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Max Monthly Budget (₹)</label>
            <Input
              type="number"
              placeholder="e.g. 10000"
              value={maxBudgetINR}
              onChange={(e) => setMaxBudgetINR(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Preferences Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <Switch
                id="veg-switch"
                checked={vegetarianOnly}
                onCheckedChange={setVegetarianOnly}
              />
              <label htmlFor="veg-switch" className="text-xs font-medium cursor-pointer text-foreground">
                Vegetarian Only
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="student-switch"
                checked={studentOnly}
                onCheckedChange={setStudentOnly}
              />
              <label htmlFor="student-switch" className="text-xs font-medium cursor-pointer text-foreground">
                Students Only
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="smoker-switch"
                checked={nonSmokerOnly}
                onCheckedChange={setNonSmokerOnly}
              />
              <label htmlFor="smoker-switch" className="text-xs font-medium cursor-pointer text-foreground">
                Non-Smoker Only
              </label>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetClick}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
