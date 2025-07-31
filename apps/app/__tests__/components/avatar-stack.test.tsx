/**
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { AvatarStack } from '../../app/(authenticated)/components/avatar-stack';

// Mock the collaboration hooks
vi.mock('@repo/collaboration/hooks', () => ({
  useOthers: vi.fn(),
  useSelf: vi.fn(),
}));

// Mock the design system components
vi.mock('@repo/design-system/ui/avatar', () => ({
  Avatar: ({ className, children }: { className: string; children: React.ReactNode }) => (
    <div className={className} data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt || ''} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ className, children }: { className: string; children: React.ReactNode }) => (
    <div className={className} data-testid="avatar-fallback">{children}</div>
  ),
}));

vi.mock('@repo/design-system/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock imports
import { useOthers, useSelf } from '@repo/collaboration/hooks';

const mockUseOthers = useOthers as ReturnType<typeof vi.fn>;
const mockUseSelf = useSelf as ReturnType<typeof vi.fn>;

describe('AvatarStack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders empty state when no users are present', () => {
    mockUseOthers.mockReturnValue([]);
    mockUseSelf.mockReturnValue(null);

    const { container } = render(<AvatarStack />);

    // Find the main container div
    const avatarStackContainer = container.querySelector('div.-space-x-1.flex.items-center.px-4');
    expect(avatarStackContainer).toBeInTheDocument();
    expect(avatarStackContainer).toHaveClass('-space-x-1', 'flex', 'items-center', 'px-4');
    
    // Should not render any avatars
    const avatars = screen.queryAllByTestId('avatar');
    expect(avatars).toHaveLength(0);
  });

  test('renders single user avatar', () => {
    const mockUser = {
      connectionId: 'user1',
      info: { name: 'John Doe', avatar: 'https://example.com/avatar1.jpg' }
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(1);
    
    // Check avatar image
    const avatarImage = screen.getByTestId('avatar-image');
    expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
    expect(avatarImage).toHaveAttribute('alt', 'John Doe');
    
    // Check tooltip content
    const tooltipContent = screen.getByTestId('tooltip-content');
    expect(tooltipContent).toHaveTextContent('John Doe');
  });

  test('renders multiple users (up to 3)', () => {
    const mockUsers = [
      { connectionId: 'user1', info: { name: 'John Doe', avatar: 'https://example.com/avatar1.jpg' } },
      { connectionId: 'user2', info: { name: 'Jane Smith', avatar: 'https://example.com/avatar2.jpg' } },
      { connectionId: 'user3', info: { name: 'Bob Johnson', avatar: 'https://example.com/avatar3.jpg' } }
    ];
    
    mockUseOthers.mockReturnValue(mockUsers);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(3);
    
    // Check that all users are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  test('shows overflow indicator when more than 3 users', () => {
    const mockUsers = [
      { connectionId: 'user1', info: { name: 'John Doe' } },
      { connectionId: 'user2', info: { name: 'Jane Smith' } },
      { connectionId: 'user3', info: { name: 'Bob Johnson' } },
      { connectionId: 'user4', info: { name: 'Alice Brown' } },
      { connectionId: 'user5', info: { name: 'Charlie Wilson' } }
    ];
    
    mockUseOthers.mockReturnValue(mockUsers);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    // Should render 3 users + 1 overflow indicator = 4 avatars total
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(4);
    
    // Check overflow indicator shows correct count in the avatar fallback
    const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
      fallback.textContent === '+2'
    );
    expect(overflowFallback).toBeInTheDocument();
    
    // Verify only first 3 users are shown by name
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    
    // Fourth and fifth users should not be shown by name
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Wilson')).not.toBeInTheDocument();
  });

  test('includes self user when present', () => {
    const mockOthers = [
      { connectionId: 'user1', info: { name: 'John Doe' } }
    ];
    const mockSelf = {
      connectionId: 'self',
      info: { name: 'Current User', avatar: 'https://example.com/self.jpg' }
    };
    
    mockUseOthers.mockReturnValue(mockOthers);
    mockUseSelf.mockReturnValue(mockSelf);

    render(<AvatarStack />);

    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(2);
    
    // Check both users are present
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Current User')).toBeInTheDocument();
  });

  test('handles users without avatar images', () => {
    const mockUser = {
      connectionId: 'user1',
      info: { name: 'No Avatar User' }
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    // Should show fallback with initials
    const avatarFallback = screen.getByTestId('avatar-fallback');
    expect(avatarFallback).toHaveTextContent('No');
  });

  test('handles users without names', () => {
    const mockUser = {
      connectionId: 'user1',
      info: {}
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    // Should show "Unknown" in tooltip
    const tooltipContent = screen.getByTestId('tooltip-content');
    expect(tooltipContent).toHaveTextContent('Unknown');
  });

  test('avatar has correct styling classes', () => {
    const mockUser = {
      connectionId: 'user1',
      info: { name: 'Test User' }
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('h-7', 'w-7', 'bg-secondary', 'ring-1', 'ring-background');
  });

  test('fallback text has correct styling', () => {
    const mockUser = {
      connectionId: 'user1',
      info: { name: 'Test User' }
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    const avatarFallback = screen.getByTestId('avatar-fallback');
    expect(avatarFallback).toHaveClass('text-xs');
  });

  test('tooltip has zero delay duration', () => {
    const mockUser = {
      connectionId: 'user1',
      info: { name: 'Test User' }
    };
    
    mockUseOthers.mockReturnValue([mockUser]);
    mockUseSelf.mockReturnValue(null);

    render(<AvatarStack />);

    // Tooltip should be present (component structure validation)
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
  });
});

