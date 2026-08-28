import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Link } from "react-router";
import { Check, Play, RotateCcw, X } from "lucide-react";
import { QUIZ, QUIZ_VERDICTS } from "./data";
import { EASE, SectionHead } from "./ui";
import { cn } from "@/lib/utils";

type Phase = "answering" | "feedback" | "result";

/** §11 Bilim testi — 5-question interactive quiz with scoring + confetti. */
export default function Quiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [score, setScore] = useState(0);
  const [correctFlags, setCorrectFlags] = useState<boolean[]>([]);
  const confettiFired = useRef(false);

  const question = QUIZ[index];
  const isLast = index === QUIZ.length - 1;

  const pick = (i: number) => {
    if (phase !== "answering") return;
    setPicked(i);
    setPhase("feedback");
    const ok = i === question.correct;
    setCorrectFlags((f) => [...f, ok]);
    if (ok) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setPhase("result");
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
      setPhase("answering");
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setPhase("answering");
    setScore(0);
    setCorrectFlags([]);
    confettiFired.current = false;
  };

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#2E7D5F", "#D9A441", "#F4EEE1", "#B98428"],
      disableForReducedMotion: true,
    });
  }, []);

  useEffect(() => {
    if (phase === "result" && score >= 4 && !confettiFired.current) {
      confettiFired.current = true;
      const t = setTimeout(fireConfetti, 350);
      return () => clearTimeout(t);
    }
  }, [phase, score, fireConfetti]);

  const verdict =
    phase === "result"
      ? (QUIZ_VERDICTS.filter((v) => score >= v.min).pop()?.text ?? "")
      : "";

  return (
    <div>
      <SectionHead
        eyebrow="11 · TEST"
        title="O'zingizni sinang"
        sub="5 ta savol — moliyaviy sezgirligingizni tekshiring."
      />

      <motion.div
        className="mx-auto mt-8 max-w-[640px] rounded-3xl border border-sand-200 bg-white p-6 shadow-card md:p-8"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* progress dots */}
        <div className="flex items-center justify-center gap-2">
          {QUIZ.map((_, i) => (
            <motion.span
              key={i}
              initial={false}
              animate={{ scale: i < correctFlags.length ? [1, 1.4, 1] : 1 }}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors duration-200",
                i < correctFlags.length
                  ? correctFlags[i]
                    ? "bg-emerald-600"
                    : "bg-clay-500"
                  : i === index && phase !== "result"
                    ? "bg-emerald-600/40"
                    : "bg-sand-200"
              )}
            />
          ))}
        </div>

        <div className="relative mt-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            {phase !== "result" ? (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -48 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <p className="text-caption text-ink-400">
                  Savol {index + 1} / {QUIZ.length}
                </p>
                <h3 className="mt-2 text-h3 !text-xl">{question.q}</h3>

                <div className="mt-5 space-y-3">
                  {question.answers.map((a, i) => {
                    const isPicked = picked === i;
                    const isCorrect = i === question.correct;
                    const showState = phase === "feedback";
                    return (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => pick(i)}
                        disabled={phase !== "answering"}
                        animate={
                          showState && isPicked && !isCorrect
                            ? { x: [0, -4, 4, -4, 0] }
                            : {}
                        }
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "btn-secondary w-full !justify-start !rounded-2xl !px-5 py-3 text-left !text-base min-h-12 transition-colors duration-200",
                          showState && isCorrect && "!border-emerald-600 !bg-emerald-50 !text-emerald-700",
                          showState && isPicked && !isCorrect && "!border-clay-500 !bg-clay-100 !text-clay-600",
                          showState && !isPicked && !isCorrect && "opacity-60"
                        )}
                      >
                        <span className="flex-1">{a}</span>
                        {showState && isCorrect && <Check className="h-5 w-5 shrink-0" />}
                        {showState && isPicked && !isCorrect && <X className="h-5 w-5 shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {phase === "feedback" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p
                        className={cn(
                          "mt-4 rounded-xl px-4 py-3 text-body-sm",
                          picked === question.correct
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-clay-100 text-clay-600"
                        )}
                      >
                        {question.explanation}
                      </p>
                      <button type="button" onClick={next} className="btn-primary mt-4 w-full">
                        {isLast ? "Natijani ko'rish" : "Keyingi savol"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-center"
              >
                <p className="text-caption text-ink-400">Natijangiz</p>
                <div className="mt-3 font-money text-5xl font-bold text-emerald-600">
                  {score}/5
                </div>
                <p className="mt-3 font-display text-xl font-semibold text-ink-900">{verdict}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link to="/game" className="btn-primary">
                    <Play className="h-4 w-4" />
                    Bilimni amalda sinash
                  </Link>
                  <button type="button" onClick={restart} className="btn-secondary">
                    <RotateCcw className="h-4 w-4" />
                    Qayta urinish
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
