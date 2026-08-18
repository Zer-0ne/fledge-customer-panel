'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Save,
  Send,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/components/ui/toast';
import { LocationPicker } from '@/components/common/location-picker';
import { createDraft, publishRequest, friendlyNeedNowError } from '@/lib/api/services/neednow';
import { fetchColleges, fetchCampuses } from '@/lib/api/services/discovery';
import { College, Campus } from '@/types';
import {
  NeedNowIntentType,
  NeedNowVisibility,
  StayDurationType,
  PreferredRoomType,
  NeedNowFurnishing,
  NeedNowOccupancy,
  NeedNowStudentOrProfessional,
  NeedNowFoodPreference,
  NeedNowSleepSchedule,
  NeedNowCleanliness,
} from '@/types';

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

const INTENT_OPTIONS: Array<{ value: NeedNowIntentType; label: string; hint: string }> = [
  { value: 'SEEKING_PRIVATE_ROOM', label: 'Private room', hint: 'A room of my own in a shared home' },
  { value: 'SEEKING_SHARED_ROOM', label: 'Shared room', hint: 'Happy to share a room with a flatmate' },
  { value: 'SEEKING_FULL_FLAT', label: 'Full flat', hint: 'An entire flat for myself or a group' },
  { value: 'SEEKING_PG', label: 'PG', hint: 'A paying guest accommodation' },
  { value: 'SEEKING_FLATMATES_TO_RENT_TOGETHER', label: 'Flatmates — search together', hint: 'Find people, then rent a place together' },
  { value: 'FLEXIBLE', label: 'Flexible', hint: 'Open to any of the above' },
];

const RADIUS_OPTIONS = [
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 2000, label: 'Within 2 km' },
  { value: 5000, label: 'Within 5 km' },
  { value: 10000, label: 'Within 10 km' },
  { value: 20000, label: 'Within 20 km' },
];

const STAY_DURATION_OPTIONS: Array<{ value: StayDurationType; label: string }> = [
  { value: 'LESS_THAN_3_MONTHS', label: 'Less than 3 months' },
  { value: '3_TO_6_MONTHS', label: '3–6 months' },
  { value: '6_TO_12_MONTHS', label: '6–12 months' },
  { value: 'OVER_12_MONTHS', label: 'More than 12 months' },
  { value: 'FLEXIBLE', label: 'Flexible' },
];

const ROOM_TYPE_OPTIONS: Array<{ value: PreferredRoomType; label: string }> = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'SHARED_2', label: 'Shared (2)' },
  { value: 'SHARED_3_PLUS', label: 'Shared (3+)' },
  { value: 'FULL_FLAT', label: 'Full flat' },
];

const VISIBILITY_OPTIONS: Array<{ value: NeedNowVisibility; label: string; hint: string }> = [
  { value: 'EVERYONE_NEARBY', label: 'Everyone nearby', hint: 'Any student within your search radius can respond' },
  { value: 'SAME_CAMPUS', label: 'Same campus', hint: 'Only students at the same campus can respond' },
  { value: 'VERIFIED_USERS_ONLY', label: 'Verified users only', hint: 'Only verified students and partners can respond' },
];

const STEP_LABELS = ['Intent', 'Location', 'Budget', 'Preferences', 'Introduction'];

interface DraftState {
  intentType: NeedNowIntentType | '';
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  campusId: string;
  budgetMinINR: string;
  budgetMaxINR: string;
  moveInDate: string;
  stayDurationType: StayDurationType | '';
  roomTypes: PreferredRoomType[];
  furnishing: NeedNowFurnishing;
  occupancy: NeedNowOccupancy;
  studentOrProfessional: NeedNowStudentOrProfessional;
  foodPreference: NeedNowFoodPreference;
  smokingOk: boolean;
  petsOk: boolean;
  sleepSchedule: NeedNowSleepSchedule;
  cleanliness: NeedNowCleanliness;
  visitorsOk: boolean;
  visibility: NeedNowVisibility;
  allowVerifiedPartners: boolean;
  description: string;
}

const INITIAL_STATE: DraftState = {
  intentType: '',
  locationName: '',
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  radiusMeters: 5000,
  campusId: '',
  budgetMinINR: '',
  budgetMaxINR: '',
  moveInDate: '',
  stayDurationType: '',
  roomTypes: [],
  furnishing: 'ANY',
  occupancy: 'ANY',
  studentOrProfessional: 'ANY',
  foodPreference: 'ANY',
  smokingOk: false,
  petsOk: false,
  sleepSchedule: 'FLEXIBLE',
  cleanliness: 'MODERATE',
  visitorsOk: false,
  visibility: 'EVERYONE_NEARBY',
  allowVerifiedPartners: false,
  description: '',
};

function NewNeedNowPageInner() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [draft, setDraft] = React.useState<DraftState>(INITIAL_STATE);
  const [colleges, setColleges] = React.useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = React.useState('');
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<'publish' | 'draft' | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const collegeList = await fetchColleges();
      if (!cancelled) setColleges(collegeList || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleCollegeChange = async (collegeId: string) => {
    setSelectedCollegeId(collegeId);
    setField('campusId', '');
    setCampuses(collegeId ? await fetchCampuses(collegeId) : []);
  };

  // ─── Step validation ──────────────────────────────────────────────────────
  const validateStep = (targetStep: number): boolean => {
    switch (targetStep) {
      case 1:
        if (!draft.intentType) {
          showToast({ title: 'Choose an intent', description: 'Pick what you are looking for to continue.', variant: 'error' });
          return false;
        }
        return true;
      case 2:
        if (!draft.locationName.trim()) {
          showToast({ title: 'Add your area', description: 'Type your area name or pick a place on the map.', variant: 'error' });
          return false;
        }
        if (draft.radiusMeters < 100 || draft.radiusMeters > 20000) {
          showToast({ title: 'Invalid radius', description: 'Search radius must be between 100 m and 20 km.', variant: 'error' });
          return false;
        }
        return true;
      case 3: {
        const min = parseFloat(draft.budgetMinINR);
        const max = parseFloat(draft.budgetMaxINR);
        if (Number.isNaN(min) || min < 0) {
          showToast({ title: 'Invalid minimum budget', description: 'Enter a valid minimum monthly budget in ₹.', variant: 'error' });
          return false;
        }
        if (Number.isNaN(max) || max <= 0) {
          showToast({ title: 'Invalid maximum budget', description: 'Enter a valid maximum monthly budget in ₹.', variant: 'error' });
          return false;
        }
        if (max < min) {
          showToast({ title: 'Budget range is flipped', description: 'Maximum budget cannot be less than the minimum.', variant: 'error' });
          return false;
        }
        if (!draft.moveInDate) {
          showToast({ title: 'Pick a move-in date', description: 'Choose when you want to move in.', variant: 'error' });
          return false;
        }
        if (!draft.stayDurationType) {
          showToast({ title: 'Pick a stay duration', description: 'Choose how long you plan to stay.', variant: 'error' });
          return false;
        }
        return true;
      }
      case 4:
        return true;
      case 5:
        if (!draft.description.trim()) {
          showToast({ title: 'Introduce yourself', description: 'Tell seekers a bit about what you are looking for.', variant: 'error' });
          return false;
        }
        if (draft.description.trim().length < 10) {
          showToast({ title: 'Short introduction', description: 'Your introduction must be at least 10 characters.', variant: 'error' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // ─── Payload + submit ─────────────────────────────────────────────────────
  const buildPayload = () => ({
    intentType: draft.intentType as NeedNowIntentType,
    primaryLocationName: draft.locationName.trim(),
    primaryLocationPoint: { longitude: draft.longitude, latitude: draft.latitude },
    radiusMeters: draft.radiusMeters,
    budgetMinPaise: Math.round(parseFloat(draft.budgetMinINR) * 100),
    budgetMaxPaise: Math.round(parseFloat(draft.budgetMaxINR) * 100),
    moveInDate: draft.moveInDate,
    stayDurationType: draft.stayDurationType as StayDurationType,
    preferredRoomTypes: draft.roomTypes,
    description: draft.description.trim(),
    campusId: draft.campusId || undefined,
    visibility: draft.visibility,
    allowVerifiedPartners: draft.allowVerifiedPartners,
    preferences: {
      furnishing: draft.furnishing,
      occupancy: draft.occupancy,
      studentOrProfessional: draft.studentOrProfessional,
      foodPreference: draft.foodPreference,
      smokingOk: draft.smokingOk,
      petsOk: draft.petsOk,
      sleepSchedule: draft.sleepSchedule,
      cleanliness: draft.cleanliness,
      visitorsOk: draft.visitorsOk,
    },
  });

  const handlePublish = async () => {
    if (!validateStep(5)) return;
    setIsSubmitting('publish');
    try {
      const created = await createDraft(buildPayload());
      await publishRequest(created.id);
      showToast({
        title: 'Requirement published',
        description: 'Your need is live for the next 24 hours.',
        variant: 'success',
      });
      router.push('/need-now');
    } catch (err) {
      showToast({
        title: 'Could not publish',
        description: friendlyNeedNowError(err),
        variant: 'error',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!validateStep(5)) return;
    setIsSubmitting('draft');
    try {
      await createDraft(buildPayload());
      showToast({ title: 'Draft saved', description: 'You can publish it later from My Need.', variant: 'success' });
      router.push('/need-now');
    } catch (err) {
      showToast({
        title: 'Could not save draft',
        description: friendlyNeedNowError(err),
        variant: 'error',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const toggleRoomType = (type: PreferredRoomType) => {
    setDraft((prev) => {
      const without = prev.roomTypes.filter((t) => t !== type);
      if (without.length === prev.roomTypes.length) {
        return { ...prev, roomTypes: [...without, type] };
      }
      return { ...prev, roomTypes: without.length > 0 ? without : [] };
    });
  };

  const busy = isSubmitting !== null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            Post a 24-hour requirement
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tell students near you what you need right now. Your requirement stays
            live for exactly 24 hours — no expiry dates to manage.
          </p>
        </div>

        {/* Stepper */}
        <ol className="flex items-center gap-1.5 overflow-x-auto py-1" aria-label="Form steps">
          {STEP_LABELS.map((label, index) => {
            const stepNumber = index + 1;
            const isCurrent = step === stepNumber;
            const isDone = step > stepNumber;
            return (
              <li key={label} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => stepNumber < step && setStep(stepNumber)}
                  disabled={stepNumber >= step}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/60 text-muted-foreground'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-background/20 text-[10px]">
                    {isDone ? <Check className="size-3" /> : stepNumber}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {stepNumber < STEP_LABELS.length && (
                  <span className="h-px w-3 bg-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>

        <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs">
          {/* Step 1 — Intent */}
          {step === 1 && (
            <fieldset className="space-y-4">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Target className="size-4 text-primary" />
                What are you looking for?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Intent type">
                {INTENT_OPTIONS.map((option) => {
                  const selected = draft.intentType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setField('intentType', option.value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-primary/60 bg-primary/5 shadow-xs'
                          : 'border-border/60 bg-background hover:border-border'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Step 2 — Location */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold text-foreground">
                <MapPin className="size-4 text-primary" />
                Where do you need it?
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="area-name">
                  Primary area name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="area-name"
                  placeholder="e.g. Kamla Nagar, North Campus"
                  value={draft.locationName}
                  onChange={(e) => setField('locationName', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Pick the exact spot</label>
                <LocationPicker
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  onLocationChange={(lat, lng) => {
                    setField('latitude', lat);
                    setField('longitude', lng);
                  }}
                  onAddressChange={(address) => setField('locationName', address)}
                  initialQuery={draft.locationName}
                  title="Preferred area"
                  className="h-64 w-full rounded-xl overflow-hidden border border-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="radius">
                    Search radius
                  </label>
                  <Select
                    id="radius"
                    value={String(draft.radiusMeters)}
                    onChange={(e) => setField('radiusMeters', Number(e.target.value))}
                    className="rounded-xl"
                  >
                    {RADIUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="campus">
                    Campus <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Select
                    id="campus"
                    value={selectedCollegeId}
                    onChange={(e) => void handleCollegeChange(e.target.value)}
                    className="rounded-xl"
                  >
                    <option value="">Select college</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </Select>
                  {selectedCollegeId && (
                    <Select
                      value={draft.campusId}
                      onChange={(e) => setField('campusId', e.target.value)}
                      className="rounded-xl"
                      aria-label="Select campus"
                    >
                      <option value="">Select campus</option>
                      {campuses.map((campus) => (
                        <option key={campus.id} value={campus.id}>
                          {campus.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Budget & dates */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold text-foreground">
                <IndianRupee className="size-4 text-primary" />
                Budget & dates
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="budget-min">
                    Minimum budget (₹/mo) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="budget-min"
                    type="number"
                    min={0}
                    placeholder="e.g. 5000"
                    value={draft.budgetMinINR}
                    onChange={(e) => setField('budgetMinINR', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="budget-max">
                    Maximum budget (₹/mo) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="budget-max"
                    type="number"
                    min={0}
                    placeholder="e.g. 12000"
                    value={draft.budgetMaxINR}
                    onChange={(e) => setField('budgetMaxINR', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="move-in">
                    Move-in date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="move-in"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={draft.moveInDate}
                    onChange={(e) => setField('moveInDate', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="stay-duration">
                    Stay duration <span className="text-destructive">*</span>
                  </label>
                  <Select
                    id="stay-duration"
                    value={draft.stayDurationType}
                    onChange={(e) => setField('stayDurationType', e.target.value as StayDurationType)}
                    className="rounded-xl"
                  >
                    <option value="">Select duration</option>
                    {STAY_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-foreground">Preferred room types</legend>
                <div className="flex flex-wrap gap-3">
                  {ROOM_TYPE_OPTIONS.map((option) => (
                    <Checkbox
                      key={option.value}
                      id={`room-${option.value}`}
                      checked={draft.roomTypes.includes(option.value)}
                      onChange={() => toggleRoomType(option.value)}
                      label={option.label}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* Step 4 — Preferences */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold text-foreground">
                <Users className="size-4 text-primary" />
                Preferences
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="furnishing">Furnishing</label>
                  <Select id="furnishing" value={draft.furnishing} onChange={(e) => setField('furnishing', e.target.value as NeedNowFurnishing)} className="rounded-xl">
                    <option value="ANY">Any</option>
                    <option value="FULLY_FURNISHED">Fully furnished</option>
                    <option value="SEMI_FURNISHED">Semi-furnished</option>
                    <option value="UNFURNISHED">Unfurnished</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="occupancy">Occupancy</label>
                  <Select id="occupancy" value={draft.occupancy} onChange={(e) => setField('occupancy', e.target.value as NeedNowOccupancy)} className="rounded-xl">
                    <option value="ANY">Any</option>
                    <option value="SINGLE">Single occupancy</option>
                    <option value="DOUBLE">Double occupancy</option>
                    <option value="TRIPLE_PLUS">Triple or more</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="student-working">Who are you open to?</label>
                  <Select id="student-working" value={draft.studentOrProfessional} onChange={(e) => setField('studentOrProfessional', e.target.value as NeedNowStudentOrProfessional)} className="rounded-xl">
                    <option value="ANY">Anyone</option>
                    <option value="STUDENT">Students only</option>
                    <option value="WORKING_PROFESSIONAL">Working professionals only</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="food">Food preference</label>
                  <Select id="food" value={draft.foodPreference} onChange={(e) => setField('foodPreference', e.target.value as NeedNowFoodPreference)} className="rounded-xl">
                    <option value="ANY">Any</option>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-vegetarian</option>
                    <option value="EGGETARIAN">Eggitarian</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="sleep">Sleep schedule</label>
                  <Select id="sleep" value={draft.sleepSchedule} onChange={(e) => setField('sleepSchedule', e.target.value as NeedNowSleepSchedule)} className="rounded-xl">
                    <option value="FLEXIBLE">Flexible</option>
                    <option value="EARLY_BIRD">Early bird</option>
                    <option value="NIGHT_OWL">Night owl</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="cleanliness">Cleanliness</label>
                  <Select id="cleanliness" value={draft.cleanliness} onChange={(e) => setField('cleanliness', e.target.value as NeedNowCleanliness)} className="rounded-xl">
                    <option value="RELAXED">Relaxed</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="TIDY">Tidy</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                  <span className="text-xs font-medium text-foreground">Non-smoker home</span>
                  <Switch checked={draft.smokingOk} onCheckedChange={(v) => setField('smokingOk', v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                  <span className="text-xs font-medium text-foreground">Pets allowed</span>
                  <Switch checked={draft.petsOk} onCheckedChange={(v) => setField('petsOk', v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                  <span className="text-xs font-medium text-foreground">Visitors allowed</span>
                  <Switch checked={draft.visitorsOk} onCheckedChange={(v) => setField('visitorsOk', v)} />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-foreground">Who can see this requirement?</legend>
                <div className="space-y-2" role="radiogroup" aria-label="Visibility">
                  {VISIBILITY_OPTIONS.map((option) => {
                    const selected = draft.visibility === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setField('visibility', option.value)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-primary/60 bg-primary/5'
                            : 'border-border/60 bg-card hover:border-border'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                          }`}
                          aria-hidden
                        >
                          {selected && <Check className="size-2.5 text-primary-foreground" />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-foreground">{option.label}</span>
                          <span className="block text-xs text-muted-foreground">{option.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                <span className="text-xs font-medium text-foreground">
                  Allow offers from verified partners
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    Let verified property partners offer you listings
                  </span>
                </span>
                <Switch checked={draft.allowVerifiedPartners} onCheckedChange={(v) => setField('allowVerifiedPartners', v)} />
              </div>
            </div>
          )}

          {/* Step 5 — Introduction + preview */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-semibold text-foreground">
                <CalendarDays className="size-4 text-primary" />
                Introduce yourself
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="description">
                  Description <span className="text-destructive">*</span>
                  <span className="ml-1 font-normal text-muted-foreground">({draft.description.length}/2000)</span>
                </label>
                <Textarea
                  id="description"
                  rows={6}
                  maxLength={2000}
                  placeholder="Tell students what you need, your routine, budget split, or anything that helps them decide to respond…"
                  value={draft.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="rounded-xl resize-none text-sm"
                />
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This requirement will remain active for 24 hours.
                </p>
              </div>

              {/* Live card preview */}
              <div>
                <p className="mb-2 text-xs font-medium text-foreground">Preview</p>
                <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {draft.intentType ? INTENT_OPTIONS.find((o) => o.value === draft.intentType)?.label : 'Intent'}
                    </p>
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">24h left</span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 text-primary/70" />
                    {draft.locationName.trim() || 'Your area'}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    ₹{(draft.budgetMinINR || '0')} – ₹{(draft.budgetMaxINR || '0')}
                    <span className="font-normal text-muted-foreground">/mo</span>
                  </p>
                  {draft.description.trim() && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{draft.description.trim()}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="pt-6 mt-6 border-t border-border/40 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => router.back() : goBack}
              disabled={busy}
              className="rounded-xl gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {step < 5 ? (
              <Button type="button" onClick={goNext} className="rounded-xl gap-1.5 font-semibold px-6">
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSaveDraft()}
                  disabled={busy}
                  className="rounded-xl gap-1.5"
                >
                  {isSubmitting === 'draft' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save draft
                </Button>
                <Button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={busy}
                  className="rounded-xl gap-1.5 font-semibold px-6"
                >
                  {isSubmitting === 'publish' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Publish
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Building2 className="size-3.5" />
          Every requirement expires automatically after 24 hours. You can pause, renew, or remove it anytime.
        </p>
      </div>
    </div>
  );
}

export default function NewNeedNowPage() {
  return <NewNeedNowPageInner />;
}
