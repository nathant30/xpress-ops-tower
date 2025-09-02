import React from 'react';
import { cn } from '@/lib/utils';

// Modern table component based on the beautiful Settings layout design
export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  className?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchable?: boolean;
  addButton?: {
    label: string;
    onClick: () => void;
  };
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
}

export function Table<T = any>({
  columns,
  data,
  className,
  loading = false,
  searchPlaceholder = "Search...",
  onSearch,
  searchable = true,
  addButton,
  emptyState
}: TableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  const renderCell = (column: TableColumn<T>, record: T, index: number) => {
    const value = (record as any)[column.key];
    if (column.render) {
      return column.render(value, record, index);
    }
    return value;
  };

  const renderAvatar = (name: string) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        {(searchable || addButton) && (
          <div className="flex items-center justify-between">
            {searchable && (
              <div className="h-10 bg-gray-200 rounded-lg w-80 animate-pulse" />
            )}
            {addButton && (
              <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse" />
            )}
          </div>
        )}
        
        {/* Table skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
              </div>
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Search and Add Button */}
      {(searchable || addButton) && (
        <div className="flex items-center justify-between">
          {searchable && (
            <div className="relative">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-4 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
          )}
          
          {addButton && (
            <button
              onClick={addButton.onClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {addButton.label}
            </button>
          )}
        </div>
      )}

      {/* Table Content */}
      {data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {emptyState?.title || 'No data available'}
          </h3>
          {emptyState?.description && (
            <p className="text-gray-500 mb-4">{emptyState.description}</p>
          )}
          {emptyState?.action}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((record, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center space-x-4 flex-1">
                {columns.map((column, colIndex) => {
                  if (colIndex === 0) {
                    // First column with avatar
                    const value = (record as any)[column.key];
                    return (
                      <div key={column.key} className="flex items-center space-x-3">
                        {renderAvatar(String(value))}
                        <div>
                          {column.render ? column.render(value, record, index) : (
                            <div className="font-medium text-gray-900">{value}</div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (colIndex === columns.length - 1) {
                    // Last column (actions)
                    return (
                      <div key={column.key} className="flex items-center space-x-2">
                        {renderCell(column, record, index)}
                      </div>
                    );
                  } else {
                    // Middle columns
                    return (
                      <div key={column.key} className="flex-1">
                        {renderCell(column, record, index)}
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Status badge component for table cells
export function StatusBadge({ 
  status, 
  variant = 'default' 
}: { 
  status: string; 
  variant?: 'default' | 'success' | 'warning' | 'error' 
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant]
    )}>
      {status}
    </span>
  );
}

// Role badge component for table cells
export function RoleBadge({ role }: { role: string }) {
  const roleColors: Record<string, string> = {
    executive: 'bg-purple-100 text-purple-700',
    expansion_manager: 'bg-blue-100 text-blue-700',
    ground_ops: 'bg-green-100 text-green-700',
    risk_investigator: 'bg-red-100 text-red-700',
    default: 'bg-gray-100 text-gray-700'
  };

  const colorClass = roleColors[role] || roleColors.default;

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colorClass
    )}>
      {role.replace('_', ' ')}
    </span>
  );
}

// Action buttons for table cells
export function TableActions({ 
  onEdit, 
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete"
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <div className="flex items-center space-x-2">
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title={editLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title={deleteLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Table;