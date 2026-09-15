'use client';

/**
 * College & campus — profile section.
 *
 * Self-service by design: a student picks their college/campus from the
 * catalog, or adds it when it is missing. An added campus is usable
 * IMMEDIATELY (it is selected on the profile the moment it is created); an
 * admin verifies it afterwards and a rejection notifies the student.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/auth-provider';
import {
  listCampuses,
  listColleges,
  requestCollegeCampus,
  setMyCollege,
  type CampusOption,
  type CollegeOption,
} from '@/lib/api/services/college-campus';
import { Check, GraduationCap, Loader2, Plus, Search } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending verification',
  rejected: 'Needs attention',
};

export function CollegeCampusSection() {
  const { user, refreshSession } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = React.useState<'idle' | 'pick' | 'add'>('idle');
  const [busy, setBusy] = React.useState(false);

  // Existing-catalog picker state.
  const [colleges, setColleges] = React.useState<CollegeOption[]>([]);
  const [campuses, setCampuses] = React.useState<CampusOption[]>([]);
  const [collegeId, setCollegeId] = React.useState<string | null>(null);
  const [campusId, setCampusId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  // Add-missing state.
  const [newCollege, setNewCollege] = React.useState('');
  const [newCampus, setNewCampus] = React.useState('');

  React.useEffect(() => {
    if (mode !== 'pick' || colleges.length > 0) return;
    void listColleges()
      .then(setColleges)
      .catch(() => addToast('Could not load colleges', 'Check your connection and retry.', 'error'));
  }, [mode, colleges.length, addToast]);

  React.useEffect(() => {
    if (!collegeId) {
      setCampuses([]);
      return;
    }
    void listCampuses(collegeId)
      .then(setCampuses)
      .catch(() => addToast('Could not load campuses', 'Retry in a moment.', 'error'));
  }, [collegeId, addToast]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return colleges.slice(0, 12);
    return colleges.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 12);
  }, [colleges, query]);

  async function saveSelection() {
    if (!collegeId || !campusId) return;
    setBusy(true);
    try {
      const res = await setMyCollege(collegeId, campusId);
      await refreshSession();
      addToast('College & campus saved', res.pendingReview ? 'Your campus is pending admin verification.' : undefined, 'success');
      setMode('idle');
    } catch (error) {
      addToast('Could not save', error instanceof Error ? error.message : 'Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitNewCampus() {
    if (newCollege.trim().length < 2 || newCampus.trim().length < 2) {
      addToast('Name too short', 'Enter your college and campus names.', 'error');
      return;
    }
    setBusy(true);
    try {
      await requestCollegeCampus({ collegeName: newCollege.trim(), campusName: newCampus.trim() });
      await refreshSession();
      addToast('Campus added', 'You can use it right away — an admin will verify it in the background.', 'success');
      setNewCollege('');
      setNewCampus('');
      setMode('idle');
    } catch (error) {
      addToast('Could not add campus', error instanceof Error ? error.message : 'Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const status = user?.campusStatus ?? null;

  return (
    <div className="pt-3 border-t border-border/60 space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">College &amp; campus</p>
        {status && STATUS_LABEL[status] && (
          <Badge variant={status === 'rejected' ? 'destructive' : 'secondary'}>{STATUS_LABEL[status]}</Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/50 px-3 py-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-base shrink-0">
            <GraduationCap className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.collegeName || 'No college selected'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.campusName || 'Pick your campus so listings and verification match your campus'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode(mode === 'pick' ? 'idle' : 'pick')}>
            {mode === 'pick' ? 'Cancel' : user?.collegeId ? 'Change' : 'Select'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === 'add' ? 'idle' : 'add')}>
            <Plus className="mr-1 size-3.5" /> Add
          </Button>
        </div>
      </div>

      {mode === 'pick' && (
        <div className="space-y-3 rounded-lg border border-border/40 bg-card/40 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your college…"
              className="pl-9"
            />
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {filtered.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No match — use “Add” to create it.</p>}
            {filtered.map((college) => (
              <button
                key={college.id}
                type="button"
                onClick={() => {
                  setCollegeId(college.id);
                  setCampusId(null);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent ${
                  collegeId === college.id ? 'bg-accent font-medium' : ''
                }`}
              >
                <span className="truncate">{college.name}</span>
                {college.status === 'pending' && <Badge variant="secondary">New</Badge>}
              </button>
            ))}
          </div>

          {collegeId && (
            <div className="space-y-1 border-t border-border/40 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Campus</p>
              {campuses.length === 0 && <p className="py-1 text-xs text-muted-foreground">No campuses listed — use “Add”.</p>}
              {campuses.map((campus) => (
                <button
                  key={campus.id}
                  type="button"
                  onClick={() => setCampusId(campus.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent ${
                    campusId === campus.id ? 'bg-accent font-medium' : ''
                  }`}
                >
                  <span className="truncate">{campus.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {campus.status === 'pending' && <Badge variant="secondary">New</Badge>}
                    {campusId === campus.id && <Check className="size-4 text-primary" />}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Button size="sm" disabled={!collegeId || !campusId || busy} onClick={saveSelection}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Save selection
          </Button>
        </div>
      )}

      {mode === 'add' && (
        <div className="space-y-3 rounded-lg border border-border/40 bg-card/40 p-3">
          <p className="text-xs text-muted-foreground">
            Not in the list? Add it — you can use it immediately, and our team verifies it in the background.
          </p>
          <Input value={newCollege} onChange={(e) => setNewCollege(e.target.value)} placeholder="College name (e.g. Jamia Millia Islamia)" />
          <Input value={newCampus} onChange={(e) => setNewCampus(e.target.value)} placeholder="Campus name (e.g. Okhla Campus)" />
          <Button size="sm" disabled={busy} onClick={submitNewCampus}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
            Add &amp; use it now
          </Button>
        </div>
      )}
    </div>
  );
}
