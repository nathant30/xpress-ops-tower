'use client';

import React, { memo, useRef } from 'react';
import { 
  Upload, 
  Eye, 
  Download, 
  CheckCircle, 
  AlertTriangle
} from 'lucide-react';
import { productionLogger } from '@/lib/security/productionLogger';

interface DocumentData {
  id: string;
  type: string;
  status: 'valid' | 'expired' | 'pending' | 'rejected';
  expiryDate?: string;
  uploadDate: string;
  fileUrl?: string;
}

interface DriverDocumentsPanelProps {
  documents: DocumentData[];
  onDocumentUpload: (file: File, documentType: string) => void;
  onDocumentView: (documentId: string) => void;
  onDocumentDownload: (documentId: string) => void;
  allowedFileTypes?: string;
  maxFileSize?: number; // in MB
}

const DriverDocumentsPanel = memo<DriverDocumentsPanelProps>(({
  documents,
  onDocumentUpload,
  onDocumentView,
  onDocumentDownload,
  allowedFileTypes = "image/*,.pdf",
  maxFileSize = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentUploadClick = () => {
    productionLogger.info('Document upload initiated');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        productionLogger.warn('File size exceeded limit', { 
          fileName: file.name, 
          fileSize: file.size,
          maxSize: maxFileSize * 1024 * 1024
        });
        alert(`File size must be less than ${maxFileSize}MB`);
        return;
      }

      productionLogger.info('Document file selected for upload', { 
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      
      // For now, we'll assume the document type is determined by the context
      // In a real implementation, you might want to show a dropdown to select document type
      onDocumentUpload(file, 'general');
    }
    
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDocumentView = (documentId: string) => {
    productionLogger.info('Document view requested', { documentId });
    onDocumentView(documentId);
  };

  const handleDocumentDownload = (documentId: string) => {
    productionLogger.info('Document download requested', { documentId });
    onDocumentDownload(documentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getDocumentDisplayName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'driver_license_front': 'Driver License (Front)',
      'driver_license_back': 'Driver License (Back)',
      'nbi_clearance': 'NBI Clearance',
      'vehicle_registration': 'Vehicle Registration',
      'vehicle_insurance': 'Vehicle Insurance',
      'barangay_clearance': 'Barangay Clearance',
      'medical_certificate': 'Medical Certificate'
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Legal Documents</h3>
          <button 
            onClick={handleDocumentUploadClick}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFileTypes}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{getDocumentDisplayName(doc.type)}</h4>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleDocumentView(doc.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDocumentDownload(doc.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {doc.expiryDate && (
                <p className="text-sm text-gray-600 mb-2">
                  Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                </p>
              )}
              
              <p className="text-xs text-gray-500 mb-2">
                Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
              </p>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(doc.status)}
                <span className={`text-sm font-medium ${getStatusColor(doc.status)}`}>
                  {formatStatus(doc.status)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {documents.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Upload className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500">No documents uploaded yet</p>
            <button 
              onClick={handleDocumentUploadClick}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Upload your first document
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

DriverDocumentsPanel.displayName = 'DriverDocumentsPanel';

export default DriverDocumentsPanel;