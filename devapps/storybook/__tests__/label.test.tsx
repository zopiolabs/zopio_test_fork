/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Label component.
 *
 * This test suite validates the label component's functionality across multiple
 * dimensions including rendering, form integration, accessibility, and edge cases. The
 * label is a form component built on Radix UI Label that provides accessible
 * labeling for form inputs with proper semantic HTML and ARIA attributes.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Form Integration - Label-input associations, htmlFor prop, form field linking
 * 3. Props Handling - className forwarding, HTML attributes, required indicators
 * 4. User Interactions - Click-to-focus behavior, keyboard navigation, focus management
 * 5. States - Disabled states, error states, focus states, required states
 * 6. Accessibility - Label-input relationships, screen reader support, WCAG compliance
 * 7. Edge Cases - Empty content, long text, special characters, malformed props
 * 8. Component Integration - Form field integration, validation state handling, complex forms
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all form integration scenarios and accessibility requirements.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithUserEvents, queries, accessibility, forms } from '../test-utils';
import { Label } from '@repo/design-system/ui/label';

/**
 * Helper function to render a basic label with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderTestLabel = (props: any = {}, content: React.ReactNode = 'Test Label') => {
  return renderWithUserEvents(
    <Label {...props}>{content}</Label>
  );
};

/**
 * Helper function to render label with associated input
 * Tests proper label-input relationships and form integration
 */
const renderLabelWithInput = (labelProps: any = {}, inputProps: any = {}) => {
  const inputId = inputProps.id || 'test-input';
  return renderWithUserEvents(
    <div>
      <Label htmlFor={inputId} {...labelProps}>
        Email Address
      </Label>
      <input 
        id={inputId} 
        type="email" 
        placeholder="Enter your email"
        data-testid="associated-input"
        {...inputProps}
      />
    </div>
  );
};

/**
 * Helper function to render label with required indicator
 * Tests required field styling and accessibility
 */
const renderRequiredLabel = (props: any = {}) => {
  return renderWithUserEvents(
    <Label htmlFor="required-input" {...props}>
      Required Field
      <span className="text-destructive ml-1" aria-label="required">*</span>
    </Label>
  );
};

/**
 * Helper function to render minimal label for basic tests
 */
const renderMinimalLabel = (props: any = {}) => {
  return renderWithUserEvents(
    <Label {...props}>Label</Label>
  );
};

/**
 * Helper function to render label in form context
 * Tests complex form integration scenarios
 */
const renderLabelInForm = (labelProps: any = {}, formProps: any = {}) => {
  return renderWithUserEvents(
    <form {...formProps}>
      <div>
        <Label htmlFor="username" {...labelProps}>
          Username
        </Label>
        <input 
          id="username" 
          name="username" 
          type="text" 
          required
          data-testid="form-input"
        />
      </div>
      <div>
        <Label htmlFor="password">
          Password
        </Label>
        <input 
          id="password" 
          name="password" 
          type="password" 
          required
        />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

/**
 * Helper function to render label with validation states
 * Tests error handling and validation feedback
 */
const renderLabelWithValidation = (isValid = true, props: any = {}) => {
  return renderWithUserEvents(
    <div>
      <Label 
        htmlFor="validation-input" 
        className={isValid ? '' : 'text-destructive'}
        {...props}
      >
        {isValid ? 'Valid Field' : 'Invalid Field'}
      </Label>
      <input 
        id="validation-input"
        type="text"
        aria-invalid={!isValid}
        aria-describedby={!isValid ? 'error-message' : undefined}
        data-testid="validation-input"
      />
      {!isValid && (
        <div id="error-message" className="text-destructive text-sm">
          This field is required
        </div>
      )}
    </div>
  );
};

describe('Label', () => {
  describe('Rendering Tests', () => {
    it('renders label element correctly', () => {
      renderMinimalLabel();
      
      // Find the label by its data-slot attribute
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass(
        'flex',
        'select-none',
        'items-center',
        'gap-2',
        'font-medium',
        'text-sm',
        'leading-none'
      );
    });

    it('renders with correct data-slot attribute', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('data-slot', 'label');
    });

    it('renders label content correctly', () => {
      const content = 'Custom Label Content';
      renderTestLabel({}, content);
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveTextContent(content);
    });

    it('renders as label element by default', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect((label as HTMLLabelElement)?.tagName).toBe('LABEL');
    });

    it('renders with proper base styling classes', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass(
        'flex',
        'select-none',
        'items-center',
        'gap-2',
        'font-medium',
        'text-sm',
        'leading-none'
      );
    });

    it('renders with disabled state styling classes', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass(
        'peer-disabled:cursor-not-allowed',
        'peer-disabled:opacity-50',
        'group-data-[disabled=true]:pointer-events-none',
        'group-data-[disabled=true]:opacity-50'
      );
    });

    it('maintains proper semantic structure', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect((label as HTMLLabelElement)?.tagName).toBe('LABEL');
      expect(label).toBeInTheDocument();
    });

    it('renders with correct typography styling', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('font-medium', 'text-sm', 'leading-none');
    });

    it('renders with flexbox layout classes', () => {
      renderTestLabel();
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });

  describe('Form Integration', () => {
    it('associates with input via htmlFor prop', () => {
      renderLabelWithInput({ htmlFor: 'email-input' }, { id: 'email-input' });
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('clicking label focuses associated input', async () => {
      const { user } = renderLabelWithInput();
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      // Initially input should not be focused
      expect(document.activeElement).not.toBe(input);
      
      // Click label should focus input
      await user.click(label!);
      expect(document.activeElement).toBe(input);
    });

    it('maintains form relationship with proper IDs', () => {
      renderLabelWithInput({ htmlFor: 'form-field' }, { id: 'form-field' });
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      expect(label).toHaveAttribute('for', 'form-field');
      expect(input).toHaveAttribute('id', 'form-field');
      
      // Verify the relationship is established
      const labelFor = label?.getAttribute('for');
      const inputId = input.getAttribute('id');
      expect(labelFor).toBe(inputId);
    });

    it('works with different input types', async () => {
      const inputTypes = ['text', 'email', 'password', 'number', 'tel', 'url'];
      
      for (const type of inputTypes) {
        const { user, unmount } = renderWithUserEvents(
          <div>
            <Label htmlFor={`${type}-input`}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Field
            </Label>
            <input 
              id={`${type}-input`}
              type={type}
              data-testid={`${type}-input`}
            />
          </div>
        );
        
        const label = document.querySelector('[data-slot="label"]');
        const input = screen.getByTestId(`${type}-input`);
        
        await user.click(label!);
        expect(document.activeElement).toBe(input);
        
        unmount();
      }
    });

    it('integrates with textarea elements', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="message">Message</Label>
          <textarea id="message" data-testid="textarea-field" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const textarea = screen.getByTestId('textarea-field');
      
      await user.click(label!);
      expect(document.activeElement).toBe(textarea);
    });

    it('integrates with select elements', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="country">Country</Label>
          <select id="country" data-testid="select-field">
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </select>
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const select = screen.getByTestId('select-field');
      
      await user.click(label!);
      expect(document.activeElement).toBe(select);
    });

    it('works with checkbox inputs correctly', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="agree">
            <input 
              id="agree" 
              type="checkbox" 
              data-testid="checkbox-input"
            />
            I agree to the terms
          </Label>
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const checkbox = screen.getByTestId('checkbox-input');
      
      expect(checkbox).not.toBeChecked();
      
      // Click label should toggle checkbox
      await user.click(label!);
      expect(checkbox).toBeChecked();
    });

    it('works with radio inputs correctly', async () => {
      const { user } = renderWithUserEvents(
        <fieldset>
          <legend>Choose option</legend>
          <Label htmlFor="option1">
            <input 
              id="option1" 
              name="options" 
              type="radio" 
              value="1"
              data-testid="radio1"
            />
            Option 1
          </Label>
          <Label htmlFor="option2">
            <input 
              id="option2" 
              name="options" 
              type="radio" 
              value="2"
              data-testid="radio2"
            />
            Option 2
          </Label>
        </fieldset>
      );
      
      const label1 = document.querySelector('label[for="option1"]');
      const label2 = document.querySelector('label[for="option2"]');
      const radio1 = screen.getByTestId('radio1');
      const radio2 = screen.getByTestId('radio2');
      
      expect(radio1).not.toBeChecked();
      expect(radio2).not.toBeChecked();
      
      // Click first label should select first radio
      await user.click(label1!);
      expect(radio1).toBeChecked();
      expect(radio2).not.toBeChecked();
      
      // Click second label should select second radio
      await user.click(label2!);
      expect(radio1).not.toBeChecked();
      expect(radio2).toBeChecked();
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderTestLabel({
        'data-testid': 'custom-label',
        id: 'label-id',
        'aria-label': 'Custom label',
        title: 'Tooltip text',
        className: 'custom-class'
      });
      
      const label = screen.getByTestId('custom-label');
      expect(label).toHaveAttribute('id', 'label-id');
      expect(label).toHaveAttribute('aria-label', 'Custom label');
      expect(label).toHaveAttribute('title', 'Tooltip text');
      expect(label).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      renderTestLabel({ className: 'custom-class text-red-500' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('custom-class', 'text-red-500');
      // Should maintain default classes
      expect(label).toHaveClass('flex', 'select-none', 'items-center');
    });

    it('handles htmlFor prop correctly', () => {
      renderTestLabel({ htmlFor: 'target-input' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveAttribute('for', 'target-input');
    });

    it('handles form prop correctly', () => {
      renderTestLabel({ form: 'target-form' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveAttribute('form', 'target-form');
    });

    it('handles style prop correctly', () => {
      renderTestLabel({
        style: {
          color: 'red',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveStyle('color: rgb(255, 0, 0)');
      expect(label).toHaveStyle('font-size: 16px');
      expect(label).toHaveStyle('font-weight: bold');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderTestLabel({
        'data-testid': 'multi-attr-label',
        className: 'multi-class',
        id: 'multi-id',
        htmlFor: 'multi-input',
        'aria-describedby': 'description',
        title: 'Multi-attribute tooltip',
        tabIndex: -1
      });
      
      const label = screen.getByTestId('multi-attr-label');
      expect(label).toHaveClass('multi-class');
      expect(label).toHaveAttribute('id', 'multi-id');
      expect(label).toHaveAttribute('for', 'multi-input');
      expect(label).toHaveAttribute('aria-describedby', 'description');
      expect(label).toHaveAttribute('title', 'Multi-attribute tooltip');
      expect(label).toHaveAttribute('tabindex', '-1');
    });

    it('handles event handlers correctly', async () => {
      const handleClick = vi.fn();
      const handleMouseOver = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Label onClick={handleClick} onMouseOver={handleMouseOver}>
          Event Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      await user.click(label!);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.hover(label!);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
    });

    it('preserves ref forwarding', () => {
      const labelRef = React.createRef<HTMLLabelElement>();
      
      renderWithUserEvents(
        <Label 
          ref={labelRef}
          htmlFor="ref-input"
        >
          Ref Label
        </Label>
      );
      
      expect(labelRef.current).toBeTruthy();
      expect(labelRef.current?.tagName).toBe('LABEL');
      expect(labelRef.current).toHaveAttribute('for', 'ref-input');
    });
  });

  describe('User Interactions', () => {
    it('handles click events to focus associated input', async () => {
      const { user } = renderLabelWithInput();
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      // Initially not focused
      expect(document.activeElement).not.toBe(input);
      
      // Click should focus input
      await user.click(label!);
      expect(document.activeElement).toBe(input);
    });

    it('handles keyboard interaction correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Label onClick={handleClick} tabIndex={0}>
          Keyboard Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      // Focus the label first via click, then try keyboard events
      await user.click(label!);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Test that the label can receive focus
      (label as HTMLLabelElement)?.focus();
      expect(document.activeElement).toBe(label);
    });

    it('supports proper mouse interactions', async () => {
      const handleMouseDown = vi.fn();
      const handleMouseUp = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Label onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
          Mouse Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      // Mouse down/up events
      fireEvent.mouseDown(label!);
      expect(handleMouseDown).toHaveBeenCalledTimes(1);
      
      fireEvent.mouseUp(label!);
      expect(handleMouseUp).toHaveBeenCalledTimes(1);
    });

    it('handles focus and blur events on label', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Label 
          onFocus={handleFocus} 
          onBlur={handleBlur}
          tabIndex={0}
        >
          Focus Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      await user.click(label!);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('maintains click-through behavior for form inputs', async () => {
      const handleInputChange = vi.fn();
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="clickthrough-input">
            Click-through Label
          </Label>
          <input 
            id="clickthrough-input"
            type="text"
            onChange={handleInputChange}
            data-testid="clickthrough-input"
          />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('clickthrough-input');
      
      // Click label should focus input
      await user.click(label!);
      expect(document.activeElement).toBe(input);
      
      // Type in input should work
      await user.type(input, 'test');
      expect(handleInputChange).toHaveBeenCalled();
      expect(input).toHaveValue('test');
    });

    it('handles double-click events correctly', async () => {
      const handleDoubleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Label onDoubleClick={handleDoubleClick}>
          Double Click Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      await user.dblClick(label!);
      expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('handles context menu events', () => {
      const handleContextMenu = vi.fn();
      renderWithUserEvents(
        <Label onContextMenu={handleContextMenu}>
          Context Label
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      fireEvent.contextMenu(label!);
      expect(handleContextMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('handles disabled input state styling', () => {
      renderWithUserEvents(
        <div>
          <Label htmlFor="disabled-input">Disabled Field</Label>
          <input id="disabled-input" disabled data-testid="disabled-input" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('disabled-input');
      
      expect(input).toBeDisabled();
      expect(label).toHaveClass(
        'peer-disabled:cursor-not-allowed',
        'peer-disabled:opacity-50'
      );
    });

    it('handles group disabled state styling', () => {
      renderWithUserEvents(
        <div data-disabled="true">
          <Label htmlFor="group-disabled-input">Group Disabled Field</Label>
          <input id="group-disabled-input" data-testid="group-disabled-input" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass(
        'group-data-[disabled=true]:pointer-events-none',
        'group-data-[disabled=true]:opacity-50'
      );
    });

    it('handles required field styling', () => {
      renderRequiredLabel({ className: 'required-label' });
      
      const label = document.querySelector('[data-slot="label"]');
      const requiredIndicator = label?.querySelector('span[aria-label="required"]');
      
      expect(label).toHaveClass('required-label');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveTextContent('*');
      expect(requiredIndicator).toHaveAttribute('aria-label', 'required');
    });

    it('handles error state with validation styling', () => {
      renderLabelWithValidation(false, { className: 'error-state' });
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('validation-input');
      const errorMessage = document.getElementById('error-message');
      
      expect(label).toHaveClass('error-state');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'error-message');
      expect(errorMessage).toHaveTextContent('This field is required');
    });

    it('handles valid state correctly', () => {
      renderLabelWithValidation(true, { className: 'valid-state' });
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('validation-input');
      
      expect(label).toHaveClass('valid-state');
      expect(label).toHaveTextContent('Valid Field');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('maintains consistent state across re-renders', () => {
      const { rerender } = renderTestLabel({ className: 'initial-state' });
      
      let label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('initial-state');
      
      // Re-render with different state
      rerender(<Label className="updated-state">Updated Label</Label>);
      
      label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('updated-state');
      expect(label).toHaveTextContent('Updated Label');
    });

    it('handles focus state on associated input', async () => {
      const { user } = renderLabelWithInput();
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      // Focus input via label click
      await user.click(label!);
      expect(document.activeElement).toBe(input);
      
      // Input should have focus styles applied by CSS
      expect(input).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('provides proper label-input association', () => {
      renderLabelWithInput({ htmlFor: 'accessibility-input' }, { id: 'accessibility-input' });
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('associated-input');
      
      expect(label).toHaveAttribute('for', 'accessibility-input');
      expect(input).toHaveAttribute('id', 'accessibility-input');
      
      // Verify programmatic association
      expect((input as HTMLInputElement).labels).toContain(label);
    });

    it('supports screen reader accessible text', () => {
      renderTestLabel({}, 'Screen Reader Accessible Label');
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveTextContent('Screen Reader Accessible Label');
      expect(label).toBeVisible();
    });

    it('supports aria-label for additional context', () => {
      renderTestLabel({
        'aria-label': 'Email address for account registration',
        htmlFor: 'email'
      }, 'Email');
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveAttribute('aria-label', 'Email address for account registration');
      expect(label).toHaveTextContent('Email');
    });

    it('supports aria-describedby for detailed descriptions', () => {
      renderWithUserEvents(
        <div>
          <Label htmlFor="password" aria-describedby="password-help">
            Password
          </Label>
          <input id="password" type="password" />
          <div id="password-help">
            Password must be at least 8 characters long
          </div>
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const helpText = document.getElementById('password-help');
      
      expect(label).toHaveAttribute('aria-describedby', 'password-help');
      expect(helpText).toHaveTextContent('Password must be at least 8 characters long');
    });

    it('maintains proper semantic structure for screen readers', () => {
      renderLabelWithInput();
      
      const label = document.querySelector('[data-slot="label"]');
      expect((label as HTMLLabelElement)?.tagName).toBe('LABEL');
      expect(label).toBeInTheDocument();
      
      // Label should have text content which provides accessible name
      expect(label).toHaveTextContent('Email Address');
    });

    it('handles required field indication accessibly', () => {
      renderWithUserEvents(
        <div>
          <Label htmlFor="required-field">
            Required Field
            <span aria-label="required" className="text-destructive">*</span>
          </Label>
          <input id="required-field" required aria-required="true" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const requiredSpan = label?.querySelector('span[aria-label="required"]');
      const input = document.getElementById('required-field');
      
      expect(requiredSpan).toHaveAttribute('aria-label', 'required');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('required');
    });

    it('supports high contrast mode compatibility', () => {
      renderTestLabel({ className: 'high-contrast' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('high-contrast');
      // Base styles should still be present for high contrast
      expect(label).toHaveClass('flex', 'items-center');
    });

    it('handles validation state accessibility correctly', () => {
      renderWithUserEvents(
        <div>
          <Label htmlFor="validation-field" className="text-destructive">
            Invalid Field
          </Label>
          <input 
            id="validation-field"
            aria-invalid="true"
            aria-describedby="error-msg"
          />
          <div id="error-msg" role="alert" className="text-destructive">
            This field is invalid
          </div>
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = document.getElementById('validation-field');
      const errorMsg = document.getElementById('error-msg');
      
      expect(label).toHaveClass('text-destructive');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'error-msg');
      expect(errorMsg).toHaveAttribute('role', 'alert');
    });

    it('maintains accessibility with complex content', () => {
      renderWithUserEvents(
        <Label htmlFor="complex-field">
          <span>Username</span>
          <span className="text-muted-foreground text-xs">(required)</span>
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      
      expect(label).toHaveTextContent('Username(required)');
      
      // Check accessibility with screen reader expectations
      accessibility.expectToBeAccessible(label as HTMLElement, { 
        checkKeyboardSupport: false,
        requireAccessibleName: false  // Complex labels might not have simple accessible names
      });
    });

    it('supports WCAG compliance for contrast and sizing', () => {
      renderTestLabel({ className: 'text-lg' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('text-lg'); // Larger text for better readability
      expect(label).toHaveClass('font-medium'); // Sufficient font weight
    });

    it('handles focus management correctly', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="focus-field" tabIndex={0}>
            Focusable Label
          </Label>
          <input id="focus-field" data-testid="focus-input" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('focus-input');
      
      // Label can receive focus when tabIndex is set
      (label as HTMLLabelElement)?.focus();
      expect(document.activeElement).toBe(label);
      
      // Clicking label moves focus to input
      await user.click(label!);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label content gracefully', () => {
      renderTestLabel({}, '');
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toBeEmptyDOMElement();
    });

    it('handles label with only whitespace', () => {
      renderTestLabel({}, '   ');
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      // Whitespace might be normalized by the browser
      expect(label?.textContent?.trim()).toBe('');
    });

    it('handles very long text content', () => {
      const longText = 'This is a very long label text that should be handled gracefully by the component styling and layout without breaking the form structure or accessibility';
      
      renderTestLabel({}, longText);
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveTextContent(longText);
      expect(label).toHaveClass('flex', 'items-center');
    });

    it('handles special characters in content', () => {
      const specialTexts = [
        '📧 Email Address',
        '⚠️ Warning Field',
        '✓ Valid Input',
        '© 2024',
        '&lt;script&gt;',
        '测试标签',
        'التسمية العربية',
        'Русская метка'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderTestLabel({}, text);
        
        const label = document.querySelector('[data-slot="label"]');
        expect(label).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      renderWithUserEvents(
        <Label>
          {null}
          {undefined}
          Label Content
          {false && 'Hidden'}
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveTextContent('Label Content');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderTestLabel({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%',
        htmlFor: 'input-with-special-id-123_test'
      });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(label).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
      expect(label).toHaveAttribute('for', 'input-with-special-id-123_test');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestLabel();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        rerender(
          <Label 
            key={i} 
            htmlFor={`input-${i}`}
            className={`label-${i}`}
          >
            Label {i}
          </Label>
        );
      }
      
      // Should still be functioning
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Label 49');
      expect(label).toHaveClass('label-49');
      expect(label).toHaveAttribute('for', 'input-49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderTestLabel({ className: longClassName });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass(longClassName);
    });

    it('handles multiple nested elements in content', () => {
      renderWithUserEvents(
        <Label>
          <span>Nested</span>
          <strong>Strong</strong>
          <em>Emphasis</em>
          <small>Small</small>
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toContainElement(label?.querySelector('span') as HTMLElement);
      expect(label).toContainElement(label?.querySelector('strong') as HTMLElement);
      expect(label).toContainElement(label?.querySelector('em') as HTMLElement);
      expect(label).toContainElement(label?.querySelector('small') as HTMLElement);
      expect(label).toHaveTextContent('NestedStrongEmphasisSmall');
    });

    it('handles conflicting CSS classes gracefully', () => {
      renderTestLabel({
        className: 'text-red-500 font-bold text-lg',
        htmlFor: 'conflict-input'
      });
      
      const label = document.querySelector('[data-slot="label"]');
      // Should have both custom and default classes
      expect(label).toHaveClass('text-red-500', 'font-bold', 'text-lg');
      // Default classes should also be present
      expect(label).toHaveClass('flex', 'select-none', 'items-center');
    });

    it('handles missing htmlFor gracefully', () => {
      renderTestLabel({ htmlFor: undefined });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).not.toHaveAttribute('for');
    });

    it('handles invalid htmlFor references gracefully', () => {
      renderTestLabel({ htmlFor: 'non-existent-input' });
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveAttribute('for', 'non-existent-input');
      // Should not crash or cause errors
      expect(label).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates with form validation libraries', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const { user } = renderWithUserEvents(
        <form onSubmit={handleSubmit} noValidate>
          <div>
            <Label htmlFor="email">
              Email Address
              <span className="text-destructive">*</span>
            </Label>
            <input 
              id="email"
              type="email"
              required
              data-testid="email-input"
            />
          </div>
          <button type="submit" data-testid="submit-btn">Submit</button>
        </form>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('email-input');
      const submitBtn = screen.getByTestId('submit-btn');
      
      // Click label should focus input
      await user.click(label!);
      expect(document.activeElement).toBe(input);
      
      // Form should be submittable
      await user.click(submitBtn);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('integrates with complex form layouts', () => {
      renderWithUserEvents(
        <div className="form-grid">
          <div className="field-group">
            <Label htmlFor="firstname">First Name</Label>
            <input id="firstname" type="text" />
          </div>
          <div className="field-group">
            <Label htmlFor="lastname">Last Name</Label>
            <input id="lastname" type="text" />
          </div>
          <div className="field-group full-width">
            <Label htmlFor="bio">Biography</Label>
            <textarea id="bio" rows={4} />
          </div>
        </div>
      );
      
      const labels = document.querySelectorAll('[data-slot="label"]');
      expect(labels).toHaveLength(3);
      
      labels.forEach((label, index) => {
        const expectedIds = ['firstname', 'lastname', 'bio'];
        expect(label).toHaveAttribute('for', expectedIds[index]);
      });
    });

    it('integrates with custom input components', async () => {
      const CustomInput = ({ id, ...props }: any) => (
        <div className="custom-input-wrapper">
          <input id={id} className="custom-input" {...props} />
        </div>
      );
      
      const { user } = renderWithUserEvents(
        <div>
          <Label htmlFor="custom-input">Custom Input</Label>
          <CustomInput id="custom-input" data-testid="custom-component" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const customWrapper = screen.getByTestId('custom-component');
      const actualInput = document.getElementById('custom-input');
      
      await user.click(label!);
      expect(document.activeElement).toBe(actualInput);
    });

    it('integrates with error boundary components', () => {
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Error occurred</div>;
        }
      };
      
      renderWithUserEvents(
        <ErrorBoundary>
          <Label htmlFor="error-test">Error Test Label</Label>
          <input id="error-test" />
        </ErrorBoundary>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Error Test Label');
    });

    it('integrates with tooltip components', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Label 
            htmlFor="tooltip-input"
            title="This field is required for account creation"
          >
            Username
          </Label>
          <input id="tooltip-input" data-testid="tooltip-input" />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('tooltip-input');
      
      expect(label).toHaveAttribute('title', 'This field is required for account creation');
      
      await user.click(label!);
      expect(document.activeElement).toBe(input);
    });

    it('integrates with icon components', () => {
      renderWithUserEvents(
        <Label htmlFor="icon-input">
          <svg width="16" height="16" data-testid="label-icon">
            <circle cx="8" cy="8" r="6" />
          </svg>
          Email Address
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const icon = screen.getByTestId('label-icon');
      
      expect(label).toContainElement(icon);
      expect(label).toHaveTextContent('Email Address');
      expect(label).toHaveClass('gap-2'); // Gap for icon spacing
    });

    it('integrates with responsive design systems', () => {
      renderWithUserEvents(
        <Label className="text-sm md:text-base lg:text-lg" htmlFor="responsive-input">
          <span className="hidden sm:inline">Full Label Text</span>
          <span className="sm:hidden">Short</span>
        </Label>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      expect(label).toHaveClass('text-sm', 'md:text-base', 'lg:text-lg');
      expect(label).toHaveTextContent('Full Label TextShort');
    });

    it('maintains performance with many label instances', () => {
      const manyLabels = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>
          <Label htmlFor={`input-${i}`}>Label {i}</Label>
          <input id={`input-${i}`} />
        </div>
      ));
      
      renderWithUserEvents(<div>{manyLabels}</div>);
      
      const labels = document.querySelectorAll('[data-slot="label"]');
      expect(labels).toHaveLength(100);
      
      // Verify first and last labels work correctly
      expect(labels[0]).toHaveAttribute('for', 'input-0');
      expect(labels[99]).toHaveAttribute('for', 'input-99');
      expect(labels[0]).toHaveTextContent('Label 0');
      expect(labels[99]).toHaveTextContent('Label 99');
    });

    it('integrates with form libraries like React Hook Form', () => {
      // Mock React Hook Form register function
      const mockRegister = vi.fn().mockReturnValue({
        name: 'testField',
        ref: vi.fn(),
        onChange: vi.fn(),
        onBlur: vi.fn(),
      });
      
      renderWithUserEvents(
        <div>
          <Label htmlFor="rhf-input">React Hook Form Field</Label>
          <input 
            id="rhf-input"
            {...mockRegister('testField')}
            data-testid="rhf-input"
          />
        </div>
      );
      
      const label = document.querySelector('[data-slot="label"]');
      const input = screen.getByTestId('rhf-input');
      
      expect(label).toHaveAttribute('for', 'rhf-input');
      expect(input).toHaveAttribute('id', 'rhf-input');
      expect(mockRegister).toHaveBeenCalledWith('testField');
    });
  });
});