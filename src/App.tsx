import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";
import Lenis from "lenis";
import {
  Heart,
  Camera,
  ChevronDown,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  CalendarPlus,
  MapPin,
  Menu,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Church,
  Wine,
} from "lucide-react";
import { SakuraCanvas } from "./components/SakuraCanvas";
import { Countdown } from "./components/Countdown";
import confetti from "canvas-confetti";

// Constants & Data
const WEDDING_DATE = "2026-08-22T13:00:00";
const BRIDE = "Aharshana Raashasingham";
const GROOM = "Marcos Mena Perez";

// Formspree handles RSVP + Wish submissions (one shared form, distinguished by
// a hidden `type` field). Set VITE_FORMSPREE_ID in your Vercel env vars to the
// ID from your Formspree endpoint (the part after /f/).
const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || "mlgkqqbz";
const FORMSPREE_ENDPOINT = `https://formspree.io/f/${FORMSPREE_ID}`;

// The wishes wall is curated: submitted wishes arrive in your Formspree
// dashboard, and you copy your favourites into this list to display them here.
const SEED_WISHES: { id: number; author: string; text: string }[] = [
  {
    id: 1,
    author: "The Raashasingham Family",
    text: "May your life together be as endless and beautiful as the cherry blossoms in spring.",
  },
  {
    id: 2,
    author: "The Mena Perez Family",
    text: "Two hearts, one journey. We are overjoyed to welcome you both into forever.",
  },
  {
    id: 3,
    author: "Maria & David",
    text: "Wishing you a lifetime of love, laughter, and happily ever after.",
  },
];

const NAV_LINKS = [
  { label: "Story", id: "story" },
  { label: "Details", id: "details" },
  { label: "Gallery", id: "gallery" },
  { label: "Wishes", id: "wishes" },
];

// Google Calendar "Add to Calendar" link
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=" +
  encodeURIComponent(`${BRIDE.split(" ")[0]} & ${GROOM.split(" ")[0]}'s Wedding`) +
  "&dates=20260822T170000Z/20260823T030000Z" +
  "&details=" +
  encodeURIComponent("We can't wait to celebrate with you!") +
  "&location=" +
  encodeURIComponent("St. Mary's Church, 66 Main St S, Brampton, ON");

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [wishes, setWishes] = useState<{ id: number; author: string; text: string }[]>(SEED_WISHES);
  const [toast, setToast] = useState<string | null>(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [wishSubmitting, setWishSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<number[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Custom cursor via motion values (no per-frame React re-render)
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { damping: 30, stiffness: 200, mass: 0.5 });
  const springY = useSpring(cursorY, { damping: 30, stiffness: 200, mass: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Lightbox navigation — cycles only through photos that actually loaded
  const orderedPhotos = [...loadedPhotos].sort((a, b) => a - b);
  const stepLightbox = (dir: 1 | -1) => {
    setLightbox((cur) => {
      if (cur === null || orderedPhotos.length === 0) return cur;
      const i = orderedPhotos.indexOf(cur);
      return orderedPhotos[(i + dir + orderedPhotos.length) % orderedPhotos.length];
    });
  };

  // Lightbox keyboard controls, scroll lock, and focus trap.
  // Depends on the open/closed state only, so navigating between photos
  // doesn't re-run it and steal focus.
  const lightboxOpen = lightbox !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    lenisRef.current?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Remember what was focused so we can restore it on close
    const trigger = document.activeElement as HTMLElement | null;
    const getFocusable = (): HTMLElement[] => {
      const root = lightboxRef.current;
      if (!root) return [];
      const nodes = root.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      return [...nodes].filter((el) => !el.hasAttribute("disabled"));
    };

    // Move focus into the dialog
    getFocusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
      } else if (e.key === "ArrowRight") {
        stepLightbox(1);
      } else if (e.key === "ArrowLeft") {
        stepLightbox(-1);
      } else if (e.key === "Tab") {
        const f = getFocusable();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        const active = document.activeElement;
        if (!lightboxRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenisRef.current?.start();
      trigger?.focus?.();
    };
  }, [lightboxOpen]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el && lenisRef.current) lenisRef.current.scrollTo(el, { offset: -20 });
    else el?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isMusicPlaying) {
        audio.pause();
        setIsMusicPlaying(false);
      } else {
        await audio.play();
        setIsMusicPlaying(true);
      }
    } catch {
      setToast("Music file not found — check /public/music/ for the audio file.");
    }
  };

  const handleRSVPSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!FORMSPREE_ENDPOINT) {
      setToast("RSVP isn't configured yet — please contact the couple directly.");
      return;
    }

    setRsvpSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: "RSVP",
          _subject: `Wedding RSVP — ${data.name ?? "Guest"}`,
          ...data,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#fdf2f2", "#e6b8af", "#c5a059"],
      });
      setToast(
        data.attendance === "no"
          ? "Thank you for letting us know — you'll be missed!"
          : "Thank you! Your RSVP is confirmed 💛"
      );
      form.reset();
    } catch (err) {
      console.error(err);
      setToast("Something went wrong — please try again in a moment.");
    } finally {
      setRsvpSubmitting(false);
    }
  };

  const handleWishSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!FORMSPREE_ENDPOINT) {
      setToast("Wishes aren't configured yet — please check back soon.");
      return;
    }

    setWishSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: "Wish",
          _subject: `Wedding Wish — ${data.author ?? "Guest"}`,
          ...data,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      // Show the wish on the wall immediately for this visitor. (Wishes are
      // curated: it persists for others only once added to SEED_WISHES.)
      const newWish = {
        id: Date.now(),
        author: String(data.author ?? "Guest"),
        text: String(data.text ?? ""),
      };
      setWishes((prev) => [newWish, ...prev]);
      setToast("Your blessing has been added — thank you!");
      form.reset();
    } catch (err) {
      console.error(err);
      setToast("Couldn't post your wish — please try again.");
    } finally {
      setWishSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-editorial-peach flex flex-col items-center justify-center z-[100]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="relative"
        >
          <Sparkles className="w-24 h-24 text-editorial-gold opacity-50" />
          <motion.div
            className="absolute inset-0 border border-editorial-gold"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </motion.div>
        <h2 className="mt-8 font-serif italic text-2xl text-editorial-brown tracking-[0.2em] animate-pulse">
          Setting the Scene...
        </h2>
      </div>
    );
  }

  const initials = `M & A`;

  return (
    <div className="relative font-sans overflow-x-hidden selection:bg-editorial-pink/30">
      <SakuraCanvas />

      {/* Background audio — Chopin, Waltz in A minor (B.150). Public domain / CC0.
          Swap the files in /public/music to use your own track. */}
      <audio ref={audioRef} loop preload="none">
        <source src="/music/IT'S YOU (feat. keshi).mp3" type="audio/mpeg" />
      </audio>

      {/* NAVIGATION */}
      <header className="fixed top-4 left-4 right-4 z-[70]">
        <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-5 py-3 rounded-full bg-white/55 backdrop-blur-md border border-white/70 shadow-sm">
          <button
            onClick={() => scrollTo("hero")}
            className="font-display text-2xl text-editorial-brown leading-none cursor-pointer hover:text-editorial-goldink transition-colors"
            aria-label="Back to top"
          >
            {initials}
          </button>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-xs font-montserrat uppercase tracking-[0.2em] text-editorial-latte hover:text-editorial-brown transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMusic}
              className="p-2 rounded-full text-editorial-goldink hover:bg-editorial-gold/15 transition-colors cursor-pointer"
              aria-label={isMusicPlaying ? "Pause music" : "Play music"}
              aria-pressed={isMusicPlaying}
            >
              {isMusicPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => scrollTo("rsvp")}
              className="hidden sm:inline-block px-5 py-2 rounded-full bg-editorial-brown text-white text-[11px] font-montserrat uppercase tracking-[0.2em] hover:bg-editorial-goldink transition-colors cursor-pointer"
            >
              RSVP
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-full text-editorial-brown hover:bg-editorial-gold/15 transition-colors cursor-pointer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden mt-2 max-w-6xl mx-auto rounded-3xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm p-4 flex flex-col gap-1"
            >
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-left px-4 py-3 rounded-xl text-sm font-montserrat uppercase tracking-[0.2em] text-editorial-brown hover:bg-editorial-gold/10 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => scrollTo("rsvp")}
                className="mt-1 px-4 py-3 rounded-xl bg-editorial-brown text-white text-sm font-montserrat uppercase tracking-[0.2em] cursor-pointer"
              >
                RSVP
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Floating glow cursor (motion values — no re-render) */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[1000] mix-blend-screen hidden md:block"
        style={{ x: springX, y: springY }}
      >
        <div className="w-full h-full bg-linear-to-r from-editorial-gold/40 to-editorial-pink/40 rounded-full blur-xl" />
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 px-6 py-4 rounded-full bg-editorial-brown text-white shadow-2xl max-w-[90vw]"
          >
            <Check className="w-4 h-4 text-editorial-gold shrink-0" />
            <span className="text-sm font-serif italic">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            ref={lightboxRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${lightbox} enlarged`}
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-editorial-brown/90 backdrop-blur-sm p-4 md:p-10"
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-5 right-5 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prev — only when more than one photo is available */}
            {orderedPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                aria-label="Previous photo"
                className="absolute left-3 md:left-8 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            <motion.figure
              key={lightbox}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full flex flex-col items-center"
            >
              <img
                src={`/images/couple/${lightbox}.jpeg`}
                alt={`Cherished moment ${lightbox} of Marcos and Aharshana`}
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-sm shadow-2xl"
              />
              <figcaption className="mt-5 text-white/60 text-[11px] font-montserrat uppercase tracking-[0.3em]">
                {orderedPhotos.indexOf(lightbox) + 1} / {orderedPhotos.length}
              </figcaption>
            </motion.figure>

            {/* Next */}
            {orderedPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                aria-label="Next photo"
                className="absolute right-3 md:right-8 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HERO SECTION */}
      <section
        id="hero"
        className="relative min-h-screen w-full flex items-center overflow-hidden bg-gradient-to-b from-editorial-peach via-editorial-blush to-editorial-pink pt-28 pb-20 md:py-0"
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-24 left-16 w-10 h-10 rounded-full bg-editorial-pink blur-2xl"></div>
          <div className="absolute bottom-24 right-32 w-16 h-16 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-editorial-gold rotate-45 animate-pulse"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-center md:text-left order-2 md:order-1"
          >
            <p className="font-display text-4xl md:text-5xl text-editorial-goldink mb-3">
              We're getting married
            </p>

            <h1 className="font-display text-editorial-brown leading-[0.95] mb-6">
              <span className="block text-7xl md:text-8xl lg:text-9xl">Marcos</span>
              <span className="block text-5xl md:text-6xl text-editorial-gold my-1">&amp;</span>
              <span className="block text-7xl md:text-8xl lg:text-9xl">{BRIDE.split(" ")[0]}</span>
            </h1>

            <div className="flex justify-center md:justify-start items-center gap-5 mb-10">
              <div className="h-px w-10 bg-editorial-gold/50"></div>
              <div className="text-xs md:text-sm tracking-[0.35em] uppercase font-medium text-editorial-latte">
                Saturday · August 22 · 2026
              </div>
              <div className="h-px w-10 bg-editorial-gold/50 md:hidden"></div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mb-10 flex justify-center md:justify-start"
            >
              <Countdown targetDate={WEDDING_DATE} />
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={() => scrollTo("rsvp")}
              className="px-10 py-4 bg-editorial-brown text-white rounded-full uppercase tracking-[0.3em] text-[11px] font-semibold hover:bg-editorial-goldink transition-colors cursor-pointer"
            >
              RSVP Now
            </motion.button>
          </motion.div>

          {/* Image column — arched gold frame echoing the cathedral arches */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="order-1 md:order-2 flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full max-w-[360px] md:max-w-[420px]"
            >
              {/* Corner stars */}
              <div className="absolute -top-5 -left-5 w-10 h-10 text-editorial-gold z-20">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current"><path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" /></svg>
              </div>
              <div className="absolute -bottom-5 -right-5 w-10 h-10 text-editorial-gold z-20">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current"><path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" /></svg>
              </div>

              {/* Gold frame */}
              <div
                className="p-2 bg-linear-to-br from-editorial-gold via-[#e9d5a3] to-editorial-gold shadow-2xl"
                style={{ borderRadius: "48% 48% 8px 8px / 32% 32% 2% 2%" }}
              >
                <div
                  className="overflow-hidden bg-editorial-peach"
                  style={{ borderRadius: "46% 46% 6px 6px / 30% 30% 1.5% 1.5%" }}
                >
                  <img
                    src="/images/WED.jpg"
                    alt="Marcos and Aharshana at their wedding ceremony in the cathedral"
                    fetchPriority="high"
                    className="w-full aspect-[4/5] object-cover object-top"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.button
          onClick={() => scrollTo("story")}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-editorial-latte hover:text-editorial-brown transition-colors cursor-pointer hidden md:block"
          aria-label="Scroll to our story"
        >
          <ChevronDown className="w-8 h-8" />
        </motion.button>
      </section>

      {/* 2. OUR STORY */}
      <section className="py-24 px-6 md:py-32 bg-linear-to-b from-editorial-peach to-white overflow-hidden" id="story">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <Sparkles className="w-8 h-8 text-editorial-gold mx-auto mb-4" />
          <h2 className="font-serif text-4xl md:text-6xl text-editorial-brown mb-4 uppercase tracking-[0.1em]">Our Story</h2>
          <div className="h-px w-24 bg-editorial-gold mx-auto opacity-30" />
        </div>

        <div className="relative max-w-5xl mx-auto font-serif text-lg leading-relaxed">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-editorial-gold/20 transform -translate-x-1/2 hidden md:block" />

          {[
            { date: "August 2020", title: "The Meeting", text: "Sometimes the most beautiful love stories begin when you least expect them. What started with simple conversations and shared moments soon grew into a deep connection. Through laughter, trust, and countless memories, our hearts found their way to each other, beginning a journey that would change our lives forever. ❤️", side: "left" },
            { date: "November 15, 2025", title: "The Vow", text: "On this special day, we promised our hearts to one another and chose a lifetime of love, laughter, and endless adventures together. With hope in our hearts and dreams for the future, we began the journey toward our forever. ❤️✨", side: "right" },
            { date: "August 22, 2026", title: "The Forever", text: "Today, we say \"I do\" and begin a new chapter together. Hand in hand and heart to heart, we celebrate a bond built on friendship, trust, and endless devotion. Our forever starts here. ❤️✨", side: "left" },
          ].map((item, idx) => (
            <div key={idx} className={`relative mb-24 md:flex items-center justify-between ${item.side === "right" ? "md:flex-row-reverse" : ""}`}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`md:w-5/12 ${item.side === "right" ? "text-left" : "text-right"} p-8 glass rounded-sm`}
              >
                <div className="absolute -top-10 left-0 right-0 flex justify-center opacity-10">
                  <Heart className="w-20 h-20 text-editorial-gold" />
                </div>
                <span className="text-editorial-goldink text-xs font-montserrat font-semibold uppercase tracking-widest mb-2 block">{item.date}</span>
                <h3 className="text-3xl text-editorial-brown mb-4 italic">{item.title}</h3>
                <p className="text-editorial-latte font-light leading-relaxed not-italic">{item.text}</p>
              </motion.div>

              <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-editorial-gold z-10 hidden md:block" />
              <div className="md:w-5/12" />
            </div>
          ))}
        </div>
      </section>

      {/* 3. WEDDING DETAILS */}
      <section className="py-24 px-6 bg-linear-to-b from-white to-editorial-peach" id="details">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-6xl text-center text-editorial-brown mb-6 italic">Wedding Details</h2>
          <div className="flex justify-center mb-16">
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-editorial-gold/15 text-editorial-goldink font-montserrat text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-editorial-gold/25 transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" /> Add to Calendar
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-stretch">
            {/* CEREMONY — Cathedral window */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Cross finial at the apex */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-20 text-editorial-gold drop-shadow">
                <svg width="20" height="32" viewBox="0 0 20 32" className="fill-current">
                  <rect x="8.5" y="0" width="3" height="32" />
                  <rect x="2" y="8" width="16" height="3" />
                </svg>
              </div>

              {/* Tall gothic gold arch */}
              <div
                className="h-full p-[3px] bg-linear-to-br from-editorial-gold via-[#e9d5a3] to-editorial-gold shadow-xl"
                style={{ borderRadius: "50% 50% 6px 6px / 40% 40% 1% 1%" }}
              >
                <div
                  className="relative h-full overflow-hidden bg-linear-to-b from-white/85 to-editorial-peach/40 backdrop-blur-md px-8 pt-28 pb-12 text-center flex flex-col items-center"
                  style={{ borderRadius: "49% 49% 4px 4px / 39% 39% 0.5% 0.5%" }}
                >
                  {/* Stained-glass tint + leaded mullions in the upper window */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-2/5 opacity-45"
                    style={{ background: "linear-gradient(180deg, rgba(167,139,250,0.45), rgba(244,114,182,0.30) 45%, rgba(96,165,250,0))" }}
                  />
                  <div className="pointer-events-none absolute top-2 bottom-3/5 left-1/3 w-px bg-editorial-gold/30" />
                  <div className="pointer-events-none absolute top-2 bottom-3/5 left-2/3 w-px bg-editorial-gold/30" />
                  <div className="pointer-events-none absolute top-[26%] left-8 right-8 h-px bg-editorial-gold/25" />

                  <div className="relative z-10 flex flex-col items-center h-full">
                    <Church className="w-7 h-7 text-editorial-goldink mb-3" />
                    <div className="text-xs uppercase tracking-[0.3em] text-editorial-goldink font-bold mb-3">The Ceremony</div>
                    <h3 className="font-serif text-3xl text-editorial-brown mb-4 italic">St. Mary's Church</h3>
                    <div className="space-y-3 mb-10 text-editorial-latte font-light font-serif text-lg">
                      <p>Saturday, August 22, 2026 at 1:00 PM</p>
                      <p>66 Main St S, Brampton, ON L6W 2C8</p>
                    </div>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=St.+Mary's+Church+Brampton+66+Main+St+S"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-2 px-8 py-3 border border-editorial-goldink text-editorial-goldink text-[11px] uppercase tracking-widest font-semibold hover:bg-editorial-goldink hover:text-white transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" /> Get Directions
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RECEPTION — Banquet hall / ballroom */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              {/* Hanging chandelier */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-20 text-editorial-gold drop-shadow">
                <svg
                  width="48"
                  height="38"
                  viewBox="0 0 48 38"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                >
                  <line x1="24" y1="0" x2="24" y2="10" />
                  <circle cx="24" cy="12" r="2.2" fill="currentColor" stroke="none" />
                  <path d="M24 14 C 24 22 11 19 9 26" />
                  <path d="M24 14 C 24 22 37 19 39 26" />
                  <line x1="24" y1="15" x2="24" y2="30" />
                  <circle cx="9" cy="27" r="1.6" fill="currentColor" stroke="none" />
                  <line x1="9" y1="25" x2="9" y2="22" />
                  <circle cx="39" cy="27" r="1.6" fill="currentColor" stroke="none" />
                  <line x1="39" y1="25" x2="39" y2="22" />
                  <circle cx="24" cy="31" r="1.6" fill="currentColor" stroke="none" />
                  <line x1="24" y1="29" x2="24" y2="26" />
                </svg>
              </div>

              {/* Rectangular ballroom frame */}
              <div className="h-full p-[3px] bg-linear-to-br from-editorial-gold via-[#e9d5a3] to-editorial-gold shadow-xl rounded-[20px]">
                <div className="relative h-full overflow-hidden bg-linear-to-b from-white/85 to-editorial-blush/40 backdrop-blur-md px-8 pt-14 pb-12 text-center flex flex-col items-center rounded-[16px]">
                  {/* Scalloped gold valance */}
                  <svg
                    className="absolute top-0 inset-x-0 w-full h-4 text-editorial-gold/70"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 10"
                    aria-hidden="true"
                  >
                    <path d={"M0 0 H100 V4 " + "q 2.5 6 5 0 ".repeat(20) + "V0 H0 Z"} className="fill-current" />
                  </svg>

                  <div className="relative z-10 flex flex-col items-center h-full pt-2">
                    <Wine className="w-7 h-7 text-editorial-goldink mb-3" />
                    <div className="text-xs uppercase tracking-[0.3em] text-editorial-goldink font-bold mb-3">The Reception</div>
                    <h3 className="font-serif text-3xl text-editorial-brown mb-4 italic">Renaissance by the Creek</h3>
                    <div className="space-y-3 mb-10 text-editorial-latte font-light font-serif text-lg">
                      <p>Reception begins at 6:00 PM</p>
                      <p>3045 Southcreek Rd, Mississauga, ON L4X 2X7</p>
                    </div>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Renaissance+by+the+Creek+3045+Southcreek+Rd"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-2 px-8 py-3 border border-editorial-goldink text-editorial-goldink text-[11px] uppercase tracking-widest font-semibold hover:bg-editorial-goldink hover:text-white transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" /> Get Directions
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. GALLERY */}
      <section className="py-24 px-4 bg-white" id="gallery">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <Camera className="w-8 h-8 text-editorial-gold mx-auto mb-4" />
          <h2 className="font-serif text-4xl md:text-5xl text-editorial-brown mb-4 uppercase tracking-[0.2em]">Gallery</h2>
          <p className="text-editorial-goldink font-serif italic text-lg">Curated Moments</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n, i) => {
            const isLoaded = loadedPhotos.includes(n);
            return (
              <motion.button
                key={n}
                type="button"
                onClick={() => isLoaded && setLightbox(n)}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                aria-label={isLoaded ? `Enlarge photo ${n}` : `Photo ${n} placeholder`}
                className={`aspect-square relative group overflow-hidden rounded-2xl shadow-xl hover:shadow-editorial-gold/30 transition-all ${isLoaded ? "cursor-zoom-in" : "cursor-default"}`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-editorial-peach to-editorial-blush text-editorial-goldink">
                  <Camera className="w-7 h-7 opacity-50" />
                  <span className="text-[10px] font-montserrat uppercase tracking-[0.25em] opacity-60">Photo {n}</span>
                </div>
                <img
                  src={`/images/couple/${n}.jpeg`}
                  alt={`Cherished moment ${n} of Marcos and Aharshana`}
                  loading="lazy"
                  onLoad={() => setLoadedPhotos((prev) => (prev.includes(n) ? prev : [...prev, n]))}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {isLoaded && (
                  <div className="absolute inset-0 bg-linear-to-t from-editorial-brown/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                    <span className="flex items-center gap-2 text-white text-[10px] font-montserrat uppercase tracking-[0.2em]">
                      <Sparkles className="w-4 h-4 animate-pulse" /> View
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 5. RSVP */}
      <section className="py-24 px-6 bg-editorial-peach relative overflow-hidden" id="rsvp">
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="bg-editorial-brown text-white rounded-xs p-8 md:p-16 shadow-2xl relative">
            <div className="absolute top-4 right-4 opacity-20 text-editorial-gold">
              <Sparkles className="w-12 h-12" />
            </div>

            <h2 className="font-serif text-4xl md:text-5xl text-center mb-3 italic uppercase tracking-widest text-editorial-peach">Confirm RSVP</h2>
            <p className="text-center text-white/60 text-sm font-serif italic mb-10">Kindly respond by August 1st, 2026</p>

            <form onSubmit={handleRSVPSubmit} className="space-y-10 text-left">
              <div className="space-y-8">
                <div>
                  <label htmlFor="rsvp-name" className="block text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold mb-2">Full Name</label>
                  <input id="rsvp-name" name="name" type="text" required className="editorial-input border-white/40 text-white focus:border-editorial-gold" placeholder="Enter guest name" />
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="rsvp-email" className="block text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold mb-2">Email</label>
                    <input id="rsvp-email" name="email" type="email" required className="editorial-input border-white/40 text-white focus:border-editorial-gold" placeholder="contact@email.com" />
                  </div>
                  <div>
                    <label htmlFor="rsvp-count" className="block text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold mb-2">Party Size</label>
                    <div className="relative">
                      <select id="rsvp-count" name="guestCount" className="editorial-input border-white/40 text-white appearance-none cursor-pointer">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n} className="text-black">{n} Guest{n > 1 ? "s" : ""}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-editorial-gold pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold mb-4">Will you attend?</label>
                  <div className="flex gap-4">
                    <label className="flex-1 cursor-pointer group">
                      <input type="radio" name="attendance" value="yes" defaultChecked className="sr-only peer" />
                      <div className="py-3 border border-white/30 text-center text-xs uppercase tracking-widest transition-colors peer-checked:bg-editorial-gold peer-checked:text-editorial-brown peer-checked:border-editorial-gold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-editorial-gold">Joyfully Accept</div>
                    </label>
                    <label className="flex-1 cursor-pointer group">
                      <input type="radio" name="attendance" value="no" className="sr-only peer" />
                      <div className="py-3 border border-white/30 text-center text-xs uppercase tracking-widest transition-colors peer-checked:bg-red-400/60 peer-checked:border-red-400/60 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-editorial-gold">Regretfully Decline</div>
                    </label>
                  </div>
                </div>
              </div>

              <button
                className="w-full py-4 bg-editorial-gold text-editorial-brown rounded-xs font-montserrat uppercase tracking-[0.4em] text-[11px] font-bold hover:bg-[#d8b86a] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={rsvpSubmitting}
              >
                {rsvpSubmitting ? "Sending..." : "Submit Attendance"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. GUEST WISHES */}
      <section className="py-24 px-6 bg-white" id="wishes">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1 border border-editorial-gold/40 rounded-full mb-6">
            <span className="text-xs uppercase tracking-[0.3em] text-editorial-goldink font-semibold">Registry of Wishes</span>
          </div>
          <h2 className="font-serif text-4xl text-editorial-brown mb-16 italic underline decoration-editorial-gold/20 underline-offset-8">Words of Love</h2>

          <form onSubmit={handleWishSubmit} className="mb-20 glass p-8 flex flex-col md:flex-row gap-6 items-end bg-editorial-blush/10 rounded-sm">
            <div className="flex-1 text-left w-full">
              <label htmlFor="wish-author" className="text-xs uppercase tracking-widest text-editorial-goldink font-semibold block mb-2">Your Signature</label>
              <input id="wish-author" name="author" type="text" required className="editorial-input" />
            </div>
            <div className="flex-[2] text-left w-full">
              <label htmlFor="wish-text" className="text-xs uppercase tracking-widest text-editorial-goldink font-semibold block mb-2">Blessing</label>
              <input id="wish-text" name="text" type="text" required className="editorial-input" />
            </div>
            <button
              type="submit"
              disabled={wishSubmitting}
              className="bg-editorial-brown text-white p-4 rounded-xs hover:bg-editorial-goldink transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Send your blessing"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {wishes.length === 0 ? (
            <p className="text-editorial-latte font-serif italic text-lg opacity-70">
              Be the first to leave a blessing for the happy couple.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <AnimatePresence mode="popLayout">
                {wishes.map((wish, i) => (
                  <motion.div
                    key={wish.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-8 border border-editorial-gold/20 bg-editorial-peach/10 relative text-left rounded-sm"
                  >
                    <p className="text-editorial-brown font-serif italic text-lg leading-relaxed mb-6">"{wish.text}"</p>
                    <div className="flex items-center justify-between border-t border-editorial-gold/20 pt-4">
                      <span className="text-editorial-goldink font-montserrat font-semibold uppercase text-xs tracking-[0.2em]">{wish.author}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-32 bg-editorial-brown text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 px-6">
          <div className="text-xs uppercase tracking-[0.5em] text-editorial-gold mb-12">August Twenty-Second</div>
          <h2 className="font-display text-6xl md:text-8xl text-white mb-6">Thank You</h2>
          <p className="font-serif italic text-xl text-editorial-pink opacity-70 mb-20">For being part of our story</p>

          <div className="h-px w-full bg-linear-to-r from-transparent via-white/20 to-transparent mb-12"></div>

          <div className="text-[11px] uppercase tracking-[0.4em] text-white/50">
            {BRIDE.split(" ")[0]} & {GROOM.split(" ")[0]} • MMXXVI
          </div>
        </div>
      </footer>
    </div>
  );
}
