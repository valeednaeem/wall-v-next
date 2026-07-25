export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  role: {
    _id: string;
    name: string;
    slug: string;
    permissions: string[];
  };
  isEmailVerified: boolean;
  isActive: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  shortDescription?: string;
  featuredImage?: string;
  gallery: string[];
  price: number;
  salePrice?: number;
  currency: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  badges: string[];
  features: string[];
  status: string;
  isFeatured: boolean;
  rating?: number;
  reviewCount: number;
  createdAt: string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  tags: {
    _id: string;
    name: string;
    slug: string;
  }[];
  status: string;
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readTime: number;
  createdAt: string;
}

export interface Project {
  _id: string;
  name: string;
  slug: string;
  description: string;
  client: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  priority: string;
  budget: number;
  spent: number;
  progress: number;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  team: {
    user: {
      _id: string;
      name: string;
      avatar?: string;
    };
    role: string;
  }[];
  createdAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: {
    _id: string;
    name: string;
    email: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: unknown[];
  recentUsers: unknown[];
  monthlyRevenue: { month: string; amount: number }[];
}
