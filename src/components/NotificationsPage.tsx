import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Trash2, 
  Settings, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  CreditCard,
  Users,
  Cog,
  Clock,
  Filter,
  Search,
  Download,
  Check
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../types';

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    fetchNotifications
  } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'important' | 'invoice' | 'subscription' | 'customer' | 'system' | 'payment'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'type' | 'category'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const getNotificationIcon = (type: Notification['type'], category: Notification['category']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        switch (category) {
          case 'invoice':
            return <FileText className="w-5 h-5 text-blue-500" />;
          case 'subscription':
            return <CreditCard className="w-5 h-5 text-purple-500" />;
          case 'customer':
            return <Users className="w-5 h-5 text-green-500" />;
          case 'system':
            return <Cog className="w-5 h-5 text-gray-500" />;
          default:
            return <Info className="w-5 h-5 text-blue-500" />;
        }
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'نجاح';
      case 'warning': return 'تحذير';
      case 'error': return 'خطأ';
      default: return 'معلومات';
    }
  };

  const getCategoryLabel = (category: Notification['category']) => {
    switch (category) {
      case 'invoice': return 'فواتير';
      case 'subscription': return 'اشتراكات';
      case 'customer': return 'عملاء';
      case 'system': return 'نظام';
      case 'payment': return 'مدفوعات';
      default: return 'أخرى';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    // فلتر البحث
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    // فلتر النوع
    let matchesFilter = true;
    if (filter === 'unread') matchesFilter = !notification.is_read;
    else if (filter === 'important') matchesFilter = notification.is_important;
    else if (filter !== 'all') matchesFilter = notification.category === filter;
    
    return matchesSearch && matchesFilter;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'category':
        aValue = a.category;
        bValue = b.category;
        break;
      default:
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      // يمكن إضافة التنقل هنا
      console.log('التنقل إلى:', notification.action_url);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === sortedNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(sortedNotifications.map(n => n.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    if (window.confirm(`هل أنت متأكد من حذف ${selectedNotifications.length} إشعار؟`)) {
      for (const id of selectedNotifications) {
        await deleteNotification(id);
      }
      setSelectedNotifications([]);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    for (const id of selectedNotifications) {
      await markAsRead(id);
    }
    setSelectedNotifications([]);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    
    return date.toLocaleDateString('ar-SA');
  };

  const exportNotifications = () => {
    const data = sortedNotifications.map(n => ({
      'العنوان': n.title,
      'الرسالة': n.message,
      'النوع': getTypeLabel(n.type),
      'الفئة': getCategoryLabel(n.category),
      'مهم': n.is_important ? 'نعم' : 'لا',
      'مقروء': n.is_read ? 'نعم' : 'لا',
      'تاريخ الإنشاء': new Date(n.created_at).toLocaleDateString('ar-SA'),
      'تاريخ التحديث': new Date(n.updated_at).toLocaleDateString('ar-SA')
    }));

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `الإشعارات_${new Date().toLocaleDateString('ar-SA')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الإشعارات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
          <p className="text-gray-600 mt-1">
            إدارة جميع الإشعارات والتنبيهات ({notifications.length} إشعار)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportNotifications}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </button>
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Check className="w-4 h-4 ml-2" />
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* البحث */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="البحث في الإشعارات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* الفلاتر */}
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الإشعارات</option>
              <option value="unread">غير مقروءة ({unreadCount})</option>
              <option value="important">مهمة ({notifications.filter(n => n.is_important).length})</option>
              <option value="invoice">فواتير ({notifications.filter(n => n.category === 'invoice').length})</option>
              <option value="subscription">اشتراكات ({notifications.filter(n => n.category === 'subscription').length})</option>
              <option value="customer">عملاء ({notifications.filter(n => n.category === 'customer').length})</option>
              <option value="system">نظام ({notifications.filter(n => n.category === 'system').length})</option>
              <option value="payment">مدفوعات ({notifications.filter(n => n.category === 'payment').length})</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">تاريخ الإنشاء</option>
              <option value="type">النوع</option>
              <option value="category">الفئة</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className={`px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                sortOrder === 'asc' ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
              }`}
              title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              تم تحديد {selectedNotifications.length} إشعار
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMarkAsRead}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                تحديد كمقروء
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                حذف المحدد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {sortedNotifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد إشعارات</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `لم يتم العثور على إشعارات تطابق البحث "${searchTerm}"`
                : filter !== 'all'
                ? `لا توجد إشعارات ${filter === 'unread' ? 'غير مقروءة' : filter === 'important' ? 'مهمة' : getCategoryLabel(filter as any)}`
                : 'لا توجد إشعارات'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  notification.is_read ? 'opacity-75' : ''
                } ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNotifications(prev => [...prev, notification.id]);
                      } else {
                        setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                      }
                    }}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-medium ${
                          notification.is_read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 mt-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mr-4">
                        {notification.is_important && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            مهم
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 text-green-800' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          notification.type === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {getCategoryLabel(notification.category)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {notification.action_url && (
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                          >
                            {notification.action_text || 'عرض التفاصيل'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded transition-colors"
                            title="تحديد كمقروء"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          title="حذف الإشعار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            عرض {sortedNotifications.length} من أصل {notifications.length} إشعار
            {filter !== 'all' && (
              <span className="mr-2">
                (فلتر: {
                  filter === 'unread' ? 'غير مقروءة' : 
                  filter === 'important' ? 'مهمة' : 
                  filter !== 'all' ? getCategoryLabel(filter as any) : 'الكل'
                })
              </span>
            )}
          </span>
          {searchTerm && (
            <span>نتائج البحث عن: "{searchTerm}"</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
