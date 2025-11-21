
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Hammer, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

export default function StorageTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
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

    try {
      // It's safe to re-initialize; getApp() handles singletons.
      const { firebaseApp } = initializeFirebase();
      const storage = getStorage(firebaseApp);
      
      // Create a storage reference
      const storageRef = ref(storage, `test-uploads/${Date.now()}-${file.name}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      console.log('Upload successful!', snapshot);

      toast({
        title: 'Sucesso!',
        description: `Arquivo "${file.name}" enviado para a pasta "test-uploads".`,
      });

    } catch (error: any) {
      console.error('Storage Upload Error:', error);
      toast({
        title: 'Erro no Upload',
        description: error.message || 'Não foi possível enviar o arquivo. Verifique o console para mais detalhes.',
        variant: 'destructive',
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
        </CardContent>
      </Card>
    </div>
  );
}
