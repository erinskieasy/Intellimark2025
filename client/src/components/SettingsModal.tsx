import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOpenAISettings, updateOpenAISettings } from '@/lib/openai';
import { useTestGrader } from '@/context/TestGraderContext';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { resetTestGrader } = useTestGrader();
  
  // State for settings
  const [answerRecognitionInstructions, setAnswerRecognitionInstructions] = useState('');
  const [enhancedRecognition, setEnhancedRecognition] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  
  // Query to get current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: getOpenAISettings,
    onSuccess: (data) => {
      setAnswerRecognitionInstructions(data.answerRecognitionInstructions);
      setEnhancedRecognition(data.enhancedRecognition);
      setConfidenceThreshold(data.confidenceThreshold);
    }
  });
  
  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: updateOpenAISettings,
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Your settings have been updated successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Saving Settings',
        description: error instanceof Error ? error.message : 'Failed to save settings.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle save settings
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      answerRecognitionInstructions,
      enhancedRecognition,
      confidenceThreshold,
      temperature,
      topP
    });
  };
  
  // Handle clear data
  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all test data? This action cannot be undone.')) {
      resetTestGrader();
      toast({
        title: 'Data Cleared',
        description: 'All test data has been cleared successfully.'
      });
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-5">
            <Label htmlFor="recognition-instructions" className="text-sm font-medium text-gray-700 mb-2 block">
              Answer Recognition
            </Label>
            <Textarea
              id="recognition-instructions"
              placeholder="Add special instructions for recognizing handwritten answers (e.g., circled answers, underlined letters, checkmarks)"
              value={answerRecognitionInstructions}
              onChange={(e) => setAnswerRecognitionInstructions(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">AI Model Settings</h3>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="temperature">Temperature ({temperature})</Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                />
                <p className="text-xs text-gray-500 mt-1">Controls randomness: 0 is focused, 2 is more creative</p>
              </div>

              <div>
                <Label htmlFor="top-p">Top P ({topP})</Label>
                <Slider
                  id="top-p"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[topP]}
                  onValueChange={(value) => setTopP(value[0])}
                />
                <p className="text-xs text-gray-500 mt-1">Controls diversity: 0 is focused, 1 allows more variety</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="enhanced-recognition" className="text-sm text-gray-600">
                Enhanced Recognition
              </Label>
              <Switch
                id="enhanced-recognition"
                checked={enhancedRecognition}
                onCheckedChange={setEnhancedRecognition}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence-threshold" className="text-sm text-gray-600">
                Confidence Threshold
              </Label>
              <div className="flex items-center space-x-2">
                <Slider
                  id="confidence-threshold"
                  value={[confidenceThreshold]}
                  onValueChange={(value) => setConfidenceThreshold(value[0])}
                  max={100}
                  step={1}
                  className="w-32 h-2"
                />
                <span className="text-xs text-gray-700">{confidenceThreshold}%</span>
              </div>
            </div>
          </div>
          
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Storage</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Clear All Test Data</span>
              <Button
                onClick={handleClearData}
                variant="outline"
                className="bg-red-100 hover:bg-red-200 text-red-600 py-1 px-3 rounded-md text-xs font-medium transition-colors"
              >
                Clear Data
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-3 border-t border-gray-200">
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending || isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
