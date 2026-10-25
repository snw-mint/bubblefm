import { defineIcons } from "@animateicons/vanilla";
import {
  Coffee,
  Github,
  Menu,
  AtSign,
  Calendar,
  Lightbulb,
  Share,
  Info,
  Image,
  User,
  Disc3,
  X,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronDown,
  Sun,
  Moon,
  Download,
  Languages,
  SlidersHorizontal,
  Paintbrush,
  Settings,
} from "@animateicons/vanilla/lucide";

defineIcons({
  Coffee,
  Github,
  Menu,
  AtSign,
  Calendar,
  Lightbulb,
  Share,
  Info,
  Image,
  User,
  Disc3,
  X,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronDown,
  Sun,
  Moon,
  Download,
  Languages,
  SlidersHorizontal,
  Paintbrush,
  Settings,
});

if (typeof document !== "undefined") {
  document.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest("button, a, .bg-option");
    if (!trigger || trigger.contains(e.relatedTarget)) return;
    const icon = trigger.querySelector("animate-icons");
    if (icon) {
      icon.startAnimation?.();
      icon.dispatchEvent(new MouseEvent("mouseenter"));
    }
  });

  document.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest("button, a, .bg-option");
    if (!trigger || trigger.contains(e.relatedTarget)) return;
    const icon = trigger.querySelector("animate-icons");
    if (icon) {
      icon.stopAnimation?.();
      icon.dispatchEvent(new MouseEvent("mouseleave"));
    }
  });
}
