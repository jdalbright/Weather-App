"use client";

import {
  CloudSun,
  Flame,
  FlaskConical,
  HandHeart,
  Heart,
  Loader2,
  Minus,
  MoonStar,
  Search,
  ShieldAlert,
  Sparkles,
  Trees,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { type Personality } from "@/lib/personalities";

const PERSONALITY_ICONS: Record<Personality["icon"], LucideIcon> = {
  flame: Flame,
  minus: Minus,
  sparkles: Sparkles,
  moon: MoonStar,
  cloud: CloudSun,
  zap: Zap,
  heart: Heart,
  "hand-heart": HandHeart,
  search: Search,
  trees: Trees,
  "shield-alert": ShieldAlert,
  "flask-conical": FlaskConical,
};

type VoiceSettingsMenuProps = {
  allPersonalities: Personality[];
  personalityId: string;
  selectedPersonality: Personality;
  customPersonalitiesCount: number;
  customIdea: string;
  customPersonalityError: string | null;
  isGeneratingCustomPersonality: boolean;
  onCustomIdeaChange: (value: string) => void;
  onPersonalityChange: (id: string) => void;
  onDeleteCustomPersonality: (id: string) => void;
  onGenerateCustomPersonality: () => void | Promise<void>;
  showSelectedSummary?: boolean;
};

function renderPersonalityIcon(personalityOption: Personality, active: boolean) {
  const Icon = PERSONALITY_ICONS[personalityOption.icon];

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
        active
          ? "border-accent-var bg-accent-soft-var text-accent-var"
          : "surface-chip-muted text-secondary-var"
      }`}
    >
      <Icon size={18} />
    </div>
  );
}

export default function VoiceSettingsMenu({
  allPersonalities,
  personalityId,
  selectedPersonality,
  customPersonalitiesCount,
  customIdea,
  customPersonalityError,
  isGeneratingCustomPersonality,
  onCustomIdeaChange,
  onPersonalityChange,
  onDeleteCustomPersonality,
  onGenerateCustomPersonality,
  showSelectedSummary = true,
}: VoiceSettingsMenuProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-2">
        <div>
          <h3 className="theme-section-label text-sm font-bold">Forecast Voice</h3>
          <p className="theme-muted text-xs">Swipe through voices on mobile, then check the active preview below.</p>
        </div>
        <span className="surface-chip rounded-full px-3 py-1 text-xs font-bold shadow-sm">
          {selectedPersonality.label}
        </span>
      </div>

      <div className="hide-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
        {allPersonalities.map((option) => {
          const isActive = option.id === personalityId;

          return (
            <div
              key={option.id}
              className={`min-w-[224px] snap-start rounded-[24px] border transition-all md:min-w-0 ${
                isActive
                  ? "border-accent-var bg-surface-elevated-var shadow-md"
                  : "surface-tile hover-border-strong-var hover-bg-surface-card-strong-var"
              }`}
            >
              <button
                type="button"
                onClick={() => onPersonalityChange(option.id)}
                aria-pressed={isActive}
                className="min-h-[136px] w-full px-4 py-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  {renderPersonalityIcon(option, isActive)}
                  <div className="flex flex-wrap justify-end gap-2">
                    {isActive ? (
                      <span className="bg-accent-soft-var text-accent-var rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                        Active
                      </span>
                    ) : null}
                    {option.isCustom ? (
                      <span className="bg-surface-chip-var text-secondary-var rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                        Custom
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 min-w-0">
                  <p className="theme-heading text-base font-bold">{option.label}</p>
                  <p className="theme-muted mt-1 text-sm leading-snug">{option.description}</p>
                  <p className="theme-subtle mt-3 line-clamp-2 text-xs italic leading-relaxed">
                    &ldquo;{option.preview}&rdquo;
                  </p>
                </div>
              </button>
              {option.isCustom ? (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPersonality(option.id)}
                    className="theme-subtle min-h-[40px] rounded-full px-3 py-2 text-[11px] font-bold transition-colors hover-bg-surface-chip-var hover-text-primary-var"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {showSelectedSummary ? (
        <div className="surface-tile mt-4 rounded-[24px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {renderPersonalityIcon(selectedPersonality, true)}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="theme-heading text-sm font-bold">{selectedPersonality.label}</span>
                  <span className="bg-accent-soft-var text-accent-var rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    Active
                  </span>
                  {selectedPersonality.isCustom ? (
                    <span className="bg-surface-chip-var text-secondary-var rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Custom
                    </span>
                  ) : null}
                </div>
                <p className="theme-muted mt-1 text-sm font-medium leading-relaxed">{selectedPersonality.description}</p>
              </div>
            </div>

            <div className="surface-chip rounded-[20px] px-4 py-3 sm:max-w-[19rem]">
              <p className="theme-subtle text-[10px] font-bold uppercase tracking-[0.18em]">Preview</p>
              <p className="theme-heading mt-1.5 text-sm italic leading-relaxed">
                &ldquo;{selectedPersonality.preview}&rdquo;
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="surface-tile mt-3 rounded-[24px] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="theme-heading text-sm font-bold">Build Your Own</h4>
            <p className="theme-muted text-xs">Describe a vibe and the AI will turn it into a reusable forecast voice.</p>
          </div>
          <span className="surface-chip rounded-full px-3 py-1 text-[11px] font-bold shadow-sm">
            {customPersonalitiesCount}/12
          </span>
        </div>

        <textarea
          value={customIdea}
          onChange={(event) => onCustomIdeaChange(event.target.value)}
          placeholder="Try: calm airline captain, overcaffeinated soccer dad, elegant spa concierge..."
          className="organic-input focus-border-strong-var focus-bg-surface-elevated-var min-h-[104px] w-full rounded-[20px] border px-4 py-3 text-sm font-medium outline-none transition-all"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="theme-subtle text-xs">Generated voices are saved locally on this device and show up beside the built-ins.</p>
          <button
            type="button"
            onClick={() => void onGenerateCustomPersonality()}
            disabled={isGeneratingCustomPersonality || customIdea.trim().length === 0}
            className={`organic-button rounded-full px-4 py-2 text-sm ${
              isGeneratingCustomPersonality || customIdea.trim().length === 0 ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {isGeneratingCustomPersonality ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGeneratingCustomPersonality ? "Creating..." : "Create Voice"}
          </button>
        </div>

        {customPersonalityError ? (
          <p className="mt-3 text-xs font-semibold text-rose-500">{customPersonalityError}</p>
        ) : null}
      </div>
    </div>
  );
}
