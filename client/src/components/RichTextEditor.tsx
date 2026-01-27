import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Underline, Palette, Highlighter, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COLORS = [
  { name: "Schwarz", value: "#000000" },
  { name: "Rot", value: "#dc2626" },
  { name: "Blau", value: "#2563eb" },
  { name: "Grün", value: "#16a34a" },
  { name: "Orange", value: "#ea580c" },
  { name: "Lila", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
  { name: "Grau", value: "#6b7280" },
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [bgColorPickerOpen, setBgColorPickerOpen] = useState(false);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyColor = (color: string) => {
    execCommand("foreColor", color);
    setColorPickerOpen(false);
  };

  const applyBgColor = (color: string) => {
    execCommand("hiliteColor", color);
    setBgColorPickerOpen(false);
  };

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-border flex-wrap">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("bold")}
          className="h-8 w-8"
          title="Fett"
          data-testid="button-bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("italic")}
          className="h-8 w-8"
          title="Kursiv"
          data-testid="button-italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("underline")}
          className="h-8 w-8"
          title="Unterstrichen"
          data-testid="button-underline"
        >
          <Underline className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Textfarbe"
              data-testid="button-color"
            >
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => applyColor(color.value)}
                  className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  data-testid={`button-color-${color.name.toLowerCase()}`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={bgColorPickerOpen} onOpenChange={setBgColorPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Hintergrundfarbe"
              data-testid="button-bgcolor"
            >
              <Highlighter className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => applyBgColor(color.value)}
                  className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  data-testid={`button-bgcolor-${color.name.toLowerCase()}`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("insertUnorderedList")}
          className="h-8 w-8"
          title="Aufzählung"
          data-testid="button-list"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("insertOrderedList")}
          className="h-8 w-8"
          title="Nummerierte Liste"
          data-testid="button-list-ordered"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("justifyLeft")}
          className="h-8 w-8"
          title="Linksbündig"
          data-testid="button-align-left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("justifyCenter")}
          className="h-8 w-8"
          title="Zentriert"
          data-testid="button-align-center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => execCommand("justifyRight")}
          className="h-8 w-8"
          title="Rechtsbündig"
          data-testid="button-align-right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="min-h-[200px] p-4 focus:outline-none text-sm bg-white dark:bg-slate-900"
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        data-testid="richtext-editor"
        style={{
          wordBreak: "break-word",
          unicodeBidi: "plaintext",
          textAlign: "left",
        }}
      />

      <style>{`
        [data-testid="richtext-editor"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
