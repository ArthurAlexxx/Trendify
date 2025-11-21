
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Hammer, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function StorageTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadUrl, setLastUploadUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setLastUploadUrl(null); // Reset URL on new file selection
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setLastUploadUrl(null);

    try {
      // It's safe to re-initialize; getApp() handles singletons.
      const { firebaseApp } = initializeFirebase();
      const storage = getStorage(firebaseApp);
      
      // Create a storage reference
      const storageRef = ref(storage, `test-uploads/${Date.now()}-${file.name}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      setLastUploadUrl(downloadUrl);

      toast({
        title: 'Sucesso!',
        description: `Arquivo "${file.name}" enviado e URL gerada.`,
      });

    } catch (error: any) {
      console.error('Storage Upload Error:', error);
      
      let description = error.message || 'Não foi possível enviar o arquivo. Verifique o console para mais detalhes.';
      if (error.code === 'storage/unauthorized') {
          description = 'Erro de permissão (storage/unauthorized). Verifique as regras de segurança do seu Firebase Storage.';
      } else if (error.code === 'storage/object-not-found') {
          description = 'Erro (storage/object-not-found). O bucket de destino existe? O serviço de Storage foi ativado no Firebase Console?';
      } else if (error.message.includes('CORS')) {
          description = 'Erro de CORS. O domínio de origem não está autorizado. Você precisa configurar o CORS no seu bucket do Google Cloud Storage para permitir este domínio.';
      }

      toast({
        title: 'Erro no Upload',
        description: description,
        variant: 'destructive',
        duration: 9000,
      });
    } finally {
      setIsUploading(false);
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
          <Input type="file" onChange={handleFileChange} />
          <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Enviar Arquivo de Teste
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
