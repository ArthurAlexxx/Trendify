
"use client";

import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  UploadCloud,
  File as FileIcon,
  XCircle,
  Loader2,
  Sparkles,
  Clapperboard,
  Check,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { analyzeVideo, type VideoAnalysisOutput } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { SavedIdeasSheet } from "@/components/saved-ideas-sheet";
import { Video } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useTransition } from "react";
import { type VideoAnalysisOutput as VideoAnalysisOutputType } from "@/lib/types";

type AnalysisStatus = "idle" | "loading" | "success" | "error";

export default function VideoReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisOutputType | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");
  
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSaving, startSavingTransition] = useTransition();

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      resetState();
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetState = () => {
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setAnalysisError("");
  };

  const handleReset = () => {
    setFile(null);
    resetState();
  };

  const handleAnalyzeVideo = async () => {
    if (!file || !file.type.startsWith('video/')) {
        setAnalysisError("Por favor, selecione um arquivo de vídeo válido para analisar.");
        setAnalysisStatus("error");
        return;
    }

    setAnalysisStatus("loading");
    setAnalysisError("");
    setAnalysisResult(null);

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            
            const result = await analyzeVideo({ videoDataUri: base64data });

            if (result && result.data) {
                setAnalysisResult(result.data);
                setAnalysisStatus("success");
                 toast({
                    title: "Análise Concluída",
                    description: "A IA analisou o seu vídeo.",
                });
            } else {
                throw new Error(result?.error || "A análise não produziu um resultado.");
            }
        };
        reader.onerror = () => {
            throw new Error("Falha ao ler o arquivo de vídeo.");
        }
    } catch (e: any) {
        console.error("Erro na análise:", e);
        const errorMsg = e.message || "Ocorreu um erro desconhecido durante a análise.";
        setAnalysisError(errorMsg);
        setAnalysisStatus("error");
        toast({
            title: "Falha na Análise",
            description: errorMsg,
            variant: "destructive",
        });
    }
  };

  const handleSaveAnalysis = () => {
    if (!analysisResult || !file || !user || !firestore) return;

    startSavingTransition(async () => {
      try {
        const title = `Análise do vídeo: ${file.name}`;
        
        let content = `**Nota Geral:** ${analysisResult.geral}\n\n`;
        content += `**Gancho:**\n${analysisResult.gancho}\n\n`;
        content += `**Conteúdo:**\n${analysisResult.conteudo}\n\n`;
        content += `**CTA:**\n${analysisResult.cta}\n\n`;
        content += `**Checklist de Melhorias:**\n- ${analysisResult.melhorias.join('\n- ')}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Análise de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Análise Salva!',
          description: 'Você pode encontrá-la no painel de ideias salvas.',
        });
      } catch (error) {
        console.error('Failed to save analysis:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a análise. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderInitialOrSelected = () => {
    if (!file) {
      return (
        <div
          className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/10" : "border-border"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadCloud className="h-12 w-12 text-gray-400" />
          <p className="mt-4 font-semibold">Arraste e solte seu arquivo aqui</p>
          <p className="mt-1 text-sm text-muted-foreground">ou</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Selecione o Arquivo
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept="video/*"
          />
        </div>
      );
    }
    
    const isVideo = file?.type.startsWith('video/');
    const fileIcon = isVideo ? <Clapperboard className="mx-auto h-12 w-12 text-gray-400" /> : <FileIcon className="mx-auto h-12 w-12 text-gray-400" />;

    return (
      <div className="space-y-4 text-center">
        {fileIcon}
        <p className="font-medium">{file.name}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
        <div className="flex justify-center gap-4">
          {isVideo ? (
             <Button onClick={handleAnalyzeVideo} disabled={analysisStatus === 'loading'}>
              {analysisStatus === 'loading' ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Sparkles className="mr-2" />
              )}
              Analisar Vídeo
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">A análise só está disponível para vídeos no momento.</p>
          )}
          <Button onClick={handleReset} variant="outline">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const renderAnalysis = () => {
     switch(analysisStatus) {
        case 'loading':
            return (
                <div className="text-center py-10">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg font-medium">Analisando vídeo...</p>
                    <p className="mt-1 text-sm text-muted-foreground">A IA está processando o conteúdo. Isso pode levar um minuto.</p>
                </div>
            )
        case 'success':
            if (!analysisResult) return null;

            const noteMatch = analysisResult.geral.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*10/);
            const numericNote = noteMatch ? noteMatch[1] : analysisResult.geral;
            const noteDescription = noteMatch ? analysisResult.geral.replace(noteMatch[0], '').trim() : '';

            return (
                <div className="space-y-6 text-left">
                    <Card className="bg-primary/10 border-primary/20">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg text-primary text-center sm:text-left">Nota de Viralização</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            <div className="sm:col-span-1 text-center">
                                <p className="text-4xl font-bold text-foreground">{numericNote}</p>
                                <p className="text-sm text-muted-foreground">de 10</p>
                            </div>
                             <div className="hidden sm:block">
                                <Separator orientation="vertical" className="h-16" />
                             </div>
                            <div className="sm:col-span-1 text-center sm:text-left">
                                <p className="text-sm text-muted-foreground">{noteDescription}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Checklist de Melhorias</CardTitle>
                      </CardHeader>
                       <CardContent>
                        <ul className="space-y-3">
                            {analysisResult.melhorias.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{item}</span>
                                </li>
                            ))}
                        </ul>
                       </CardContent>
                    </Card>
                    
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Análise do Gancho</AccordionTrigger>
                            <AccordionContent>
                            {analysisResult.gancho}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Análise do Conteúdo</AccordionTrigger>
                            <AccordionContent>
                             {analysisResult.conteudo}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Análise do CTA</AccordionTrigger>
                            <AccordionContent>
                             {analysisResult.cta}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="flex justify-center gap-4 pt-4">
                        <Button onClick={handleSaveAnalysis} disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Salvar Análise
                        </Button>
                        <Button onClick={handleReset} variant="outline">
                            Analisar Outro Vídeo
                        </Button>
                    </div>
                </div>
            )
        case 'error':
             return (
                <div className="text-center space-y-4">
                    <XCircle className="mx-auto h-12 w-12 text-destructive" />
                     <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Erro na Análise</AlertTitle>
                      <AlertDescription>
                        {analysisError}
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleReset} variant="secondary">
                        Tentar Novamente
                    </Button>
                </div>
            )
        default:
          return null;
     }
  }


  return (
    <div className="space-y-12">
        <PageHeader
            icon={<Video />}
            title="Diagnóstico de Vídeo com IA"
            description="Receba uma análise completa e sugestões para otimizar e viralizar seu vídeo."
        >
            <SavedIdeasSheet />
        </PageHeader>
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Analisador de Vídeo</CardTitle>
                    <CardDescription>
                    Selecione um vídeo para que a IA analise seu conteúdo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {analysisStatus === 'idle' ? renderInitialOrSelected() : renderAnalysis()}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
