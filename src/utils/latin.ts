const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya", ё: "yo", ы: "y", э: "e", є: "ye", і: "i", ї: "yi",
};

export function latinUsername(text: string) {
  return text.toLowerCase().replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC[ch] ?? "");
}
