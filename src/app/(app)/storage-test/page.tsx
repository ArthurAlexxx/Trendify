
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Hammer, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export default function StorageTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUploadUrl, setLastUploadUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLastUploadUrl(null);
      setUploadProgress(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setLastUploadUrl(null);

    try {
      // O SDK resolve o bucket correto a partir da configuração.
      const storage = getStorage(initializeFirebase().firebaseApp);
      const storageRef = ref(storage, `test-uploads/${Date.now()}-${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Storage Upload Error:', error);
          setIsUploading(false);
          setUploadProgress(null);
          toast({
            title: 'Erro no Upload',
            description: `Falha ao enviar o arquivo. Código do erro: ${error.code}`,
            variant: 'destructive',
          });
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setLastUploadUrl(downloadURL);
            setIsUploading(false);
            toast({
              title: 'Sucesso!',
              description: `Arquivo "${file.name}" enviado.`,
            });
          });
        }
      );
    } catch (error: any) {
      console.error('Storage Initialization Error:', error);
      setIsUploading(false);
      setUploadProgress(null);
      toast({
        title: 'Erro de Configuração',
        description: 'Não foi possível iniciar o upload. Verifique a configuração do Firebase.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Hammer />}
        title="Teste de Conexão com Storage"
        description="Esta página serve para verificar se a conexão com o Firebase Storage está funcionando."
      />
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Teste de Upload</CardTitle>
          <CardDescription>
            Selecione qualquer arquivo e clique em "Enviar" para testar o upload para a pasta `test-uploads` no seu bucket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" onChange={handleFileChange} disabled={isUploading} />
          {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}
          <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? `Enviando... ${Math.round(uploadProgress ?? 0)}%` : 'Enviar Arquivo de Teste'}
          </Button>
          {lastUploadUrl && (
            <Alert>
              <AlertTitle>Upload Concluído!</AlertTitle>
              <AlertDescription className="break-all">
                Seu arquivo está disponível em: <a href={lastUploadUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">{lastUploadUrl}</a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
