# Legal Page System

## Overview

The legal page system provides a comprehensive framework for managing legal documents and compliance pages within the Wall-V platform. It supports 13 different legal page types with dynamic content management, version control, and GDPR compliance features.

## Legal Page Types

### Supported Page Categories

1. **privacy** - Privacy Policy
2. **terms** - Terms of Service
3. **refund** - Refund Policy
4. **cookie-policy** - Cookie Policy
5. **disclaimer** - Disclaimer
6. **sitemap** - HTML Sitemap
7. **accessibility** - Accessibility Statement
8. **acceptable-use** - Acceptable Use Policy
9. **ai-usage** - AI Usage Policy
10. **data-processing** - Data Processing Agreement
11. **copyright** - Copyright Notice
12. **contact-legal** - Legal Contact Info
13. **other** - Other Legal Pages

### Page Type Descriptions

#### Core Legal Pages
- **Privacy Policy**: Data collection, usage, and protection practices
- **Terms of Service**: Service agreement and user obligations
- **Refund Policy**: Refund terms and procedures
- **Cookie Policy**: Cookie usage and management information

#### Compliance Pages
- **Disclaimer**: Limitations and exclusions of liability
- **Accessibility Statement**: Accessibility compliance and features
- **Acceptable Use Policy**: Permitted and prohibited uses
- **AI Usage Policy**: AI feature usage guidelines and limitations

#### Data and Legal Framework
- **Data Processing Agreement**: GDPR-compliant data processing terms
- **Copyright Notice**: Intellectual property and copyright information
- **Contact Legal**: Legal department contact information

#### Utility Pages
- **Sitemap**: HTML sitemap for navigation
- **Other**: Flexible category for additional legal documents

## Core Features

### Content Management

#### Dynamic Content
- Rich text content editing
- HTML content support
- Media embedding capabilities
- Structured content organization

#### Dashboard Integration
- Legal page editor in admin dashboard
- Real-time content preview
- Draft and published states
- Bulk operations for page management

### Version Control

#### Version History
- Complete revision tracking for all legal pages
- Timestamp and author tracking for changes
- Change notes and descriptions
- Ability to view and restore previous versions

#### Change Management
- Detailed change logs
- Version comparison tools
- Approval workflows for changes
- Publication scheduling

### SEO Optimization

#### Metadata Management
- Custom title tags per legal page
- Meta descriptions for search engines
- URL slug management
- Open Graph and social media metadata

#### SEO Features
- Canonical URL management
- XML sitemap integration
- Search engine indexing controls
- Rich snippet markup

### Page Management

#### Status Control
- **Active**: Published and accessible to users
- **Inactive**: Draft or archived pages
- Status toggle for easy management
- Bulk status changes

#### Organization
- Categorization by page type
- Tagging for internal organization
- Search and filter capabilities
- Ordering and prioritization

## Security Features

### Content Sanitization
- DOMPurify integration for HTML content
- XSS attack prevention
- Safe rendering of user-generated content
- Whitelist-based tag filtering

### Access Control
- Role-based access to legal page management
- Audit logging for content changes
- Permission-based editing capabilities
- Change approval workflows

## API Endpoints

### Public API
- Fetch legal content by page type
- Version-specific content retrieval
- SEO metadata endpoints
- Sitemap generation endpoints

### Dashboard API
- CRUD operations for legal pages
- Version management endpoints
- Bulk operations API
- Search and filtering endpoints

### Response Format
- JSON-based responses
- Structured content delivery
- Metadata inclusion
- Error handling and validation

## GDPR Compliance

### Cookie Consent Management

#### Consent Framework
- Cookie consent banner for EU visitors
- Granular consent options per cookie category
- Easy consent withdrawal mechanism
- Consent record keeping

#### Cookie Categories
- **Necessary**: Essential cookies for platform functionality
- **Analytics**: Usage analytics and performance monitoring
- **Marketing**: Advertising and marketing cookies
- **Preferences**: User preference and customization cookies

#### Cookie Definitions
- Detailed cookie descriptions
- Purpose and duration information
- Third-party cookie disclosure
- Cookie provider identification

### Consent Recording

#### Per-User Consent
- Individual consent records per user
- Consent timestamp tracking
- Consent version management
- Consent history and audit trail

#### Session-Based Consent
- Anonymous visitor consent tracking
- Session-based consent storage
- Consent renewal mechanisms
- Cross-session consent persistence

### EU Compliance

#### Country Detection
- Automatic EU country detection
- GeoIP-based compliance triggering
- Regional compliance variations
- IP-based location identification

#### Data Processing
- GDPR-compliant data processing
- Data subject rights implementation
- Data portability support
- Right to erasure implementation

## Technical Implementation

### Data Storage
- MongoDB storage for legal content
- Version history in separate collections
- Metadata storage and indexing
- Efficient querying and retrieval

### Caching Strategies
- Content caching for performance
- Version-specific caching
- Cache invalidation on updates
- CDN integration for global delivery

### Performance Optimization
- Lazy loading of legal content
- Efficient pagination for large documents
- Search index optimization
- Compression and minification

### Monitoring and Analytics
- Page view tracking
- User engagement metrics
- Search engine crawl monitoring
- Performance monitoring
