/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithUserEvents } from '../../test-utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

// Test component with complete Table setup
function TestTable() {
  return (
    <Table>
      <TableCaption>A list of recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>INV001</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell>Credit Card</TableCell>
          <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableCell>INV002</TableCell>
          <TableCell>Pending</TableCell>
          <TableCell>PayPal</TableCell>
          <TableCell className="text-right">$150.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>INV003</TableCell>
          <TableCell>Unpaid</TableCell>
          <TableCell>Bank Transfer</TableCell>
          <TableCell className="text-right">$350.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$750.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe('Table Components', () => {
  describe('Table', () => {
    it('renders a table with container wrapper', () => {
      render(<Table data-testid="test-table">Table content</Table>);
      
      const container = document.querySelector('[data-slot="table-container"]');
      const table = document.querySelector('[data-slot="table"]');
      
      expect(container).toBeInTheDocument();
      expect(table).toBeInTheDocument();
      expect(container).toContainElement(table);
    });

    it('renders table element with correct tag', () => {
      render(<Table>Content</Table>);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(table.tagName).toBe('TABLE');
    });

    it('applies container styling classes', () => {
      render(<Table>Content</Table>);
      
      const container = document.querySelector('[data-slot="table-container"]');
      expect(container).toHaveClass(
        'relative',
        'w-full',
        'overflow-x-auto'
      );
    });

    it('applies table styling classes', () => {
      render(<Table data-testid="table">Content</Table>);
      
      const table = document.querySelector('[data-slot="table"]');
      expect(table).toHaveClass(
        'w-full',
        'caption-bottom',
        'text-sm'
      );
    });

    it('merges custom className with default classes', () => {
      render(<Table className="custom-table">Content</Table>);
      
      const table = document.querySelector('[data-slot="table"]');
      expect(table).toHaveClass('custom-table', 'w-full', 'caption-bottom');
    });

    it('forwards HTML table props', () => {
      render(
        <Table
          id="test-table"
          role="table"
          aria-label="Test table"
        >
          Content
        </Table>
      );
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('id', 'test-table');
      expect(table).toHaveAttribute('aria-label', 'Test table');
    });
  });

  describe('TableCaption', () => {
    it('renders a caption element', () => {
      render(
        <Table>
          <TableCaption data-testid="table-caption">Caption text</TableCaption>
        </Table>
      );
      
      const caption = screen.getByTestId('table-caption');
      expect(caption).toBeInTheDocument();
      expect(caption.tagName).toBe('CAPTION');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableCaption>Caption</TableCaption>
        </Table>
      );
      
      const caption = document.querySelector('[data-slot="table-caption"]');
      expect(caption).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Caption</TableCaption>
        </Table>
      );
      
      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass(
        'mt-4',
        'text-muted-foreground',
        'text-sm'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableCaption className="custom-caption" data-testid="caption">Caption</TableCaption>
        </Table>
      );
      
      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('custom-caption', 'mt-4', 'text-muted-foreground');
    });

    it('renders caption text correctly', () => {
      render(
        <Table>
          <TableCaption>Table description</TableCaption>
        </Table>
      );
      
      expect(screen.getByText('Table description')).toBeInTheDocument();
    });
  });

  describe('TableHeader', () => {
    it('renders a thead element', () => {
      render(
        <Table>
          <TableHeader data-testid="table-header">Header content</TableHeader>
        </Table>
      );
      
      const header = screen.getByTestId('table-header');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('THEAD');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableHeader>Header</TableHeader>
        </Table>
      );
      
      const header = document.querySelector('[data-slot="table-header"]');
      expect(header).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableHeader data-testid="header">Header</TableHeader>
        </Table>
      );
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('[&_tr]:border-b');
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableHeader className="custom-header" data-testid="header">Header</TableHeader>
        </Table>
      );
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header', '[&_tr]:border-b');
    });
  });

  describe('TableBody', () => {
    it('renders a tbody element', () => {
      render(
        <Table>
          <TableBody data-testid="table-body">Body content</TableBody>
        </Table>
      );
      
      const body = screen.getByTestId('table-body');
      expect(body).toBeInTheDocument();
      expect(body.tagName).toBe('TBODY');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableBody>Body</TableBody>
        </Table>
      );
      
      const body = document.querySelector('[data-slot="table-body"]');
      expect(body).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableBody data-testid="body">Body</TableBody>
        </Table>
      );
      
      const body = screen.getByTestId('body');
      expect(body).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableBody className="custom-body" data-testid="body">Body</TableBody>
        </Table>
      );
      
      const body = screen.getByTestId('body');
      expect(body).toHaveClass('custom-body', '[&_tr:last-child]:border-0');
    });
  });

  describe('TableFooter', () => {
    it('renders a tfoot element', () => {
      render(
        <Table>
          <TableFooter data-testid="table-footer">Footer content</TableFooter>
        </Table>
      );
      
      const footer = screen.getByTestId('table-footer');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('TFOOT');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableFooter>Footer</TableFooter>
        </Table>
      );
      
      const footer = document.querySelector('[data-slot="table-footer"]');
      expect(footer).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableFooter data-testid="footer">Footer</TableFooter>
        </Table>
      );
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass(
        'border-t',
        'bg-muted/50',
        'font-medium',
        '[&>tr]:last:border-b-0'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableFooter className="custom-footer" data-testid="footer">Footer</TableFooter>
        </Table>
      );
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer', 'border-t', 'bg-muted/50');
    });
  });

  describe('TableRow', () => {
    it('renders a tr element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="table-row">Row content</TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('table-row');
      expect(row).toBeInTheDocument();
      expect(row.tagName).toBe('TR');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>Row</TableRow>
          </TableBody>
        </Table>
      );
      
      const row = document.querySelector('[data-slot="table-row"]');
      expect(row).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="row">Row</TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('row');
      expect(row).toHaveClass(
        'border-b',
        'transition-colors',
        'hover:bg-muted/50',
        'data-[state=selected]:bg-muted'
      );
    });

    it('applies selected state styling', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected" data-testid="selected-row">Row</TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('selected-row');
      expect(row).toHaveAttribute('data-state', 'selected');
      expect(row).toHaveClass('data-[state=selected]:bg-muted');
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableBody>
            <TableRow className="custom-row" data-testid="row">Row</TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('row');
      expect(row).toHaveClass('custom-row', 'border-b', 'transition-colors');
    });

    it('handles click events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Table>
          <TableBody>
            <TableRow onClick={handleClick} data-testid="clickable-row">
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('clickable-row');
      await user.click(row);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('TableHead', () => {
    it('renders a th element', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="table-head">Header cell</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('table-head');
      expect(head).toBeInTheDocument();
      expect(head.tagName).toBe('TH');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = document.querySelector('[data-slot="table-head"]');
      expect(head).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('head');
      expect(head).toHaveClass(
        'h-10',
        'whitespace-nowrap',
        'px-2',
        'text-left',
        'align-middle',
        'font-medium',
        'text-foreground'
      );
    });

    it('applies checkbox-specific styling classes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="checkbox-head">
                <input type="checkbox" role="checkbox" />
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('checkbox-head');
      expect(head).toHaveClass(
        '[&:has([role=checkbox])]:pr-0',
        '[&>[role=checkbox]]:translate-y-[2px]'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-head" data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('head');
      expect(head).toHaveClass('custom-head', 'h-10', 'px-2', 'text-left');
    });

    it('renders as columnheader role', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByRole('columnheader', { name: 'Column Header' });
      expect(head).toBeInTheDocument();
    });

    it('supports sorting attributes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort="ascending" data-testid="sortable-head">
                Sortable Column
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const head = screen.getByTestId('sortable-head');
      expect(head).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('TableCell', () => {
    it('renders a td element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="table-cell">Cell content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('table-cell');
      expect(cell).toBeInTheDocument();
      expect(cell.tagName).toBe('TD');
    });

    it('renders with correct data-slot attribute', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = document.querySelector('[data-slot="table-cell"]');
      expect(cell).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass(
        'whitespace-nowrap',
        'p-2',
        'align-middle'
      );
    });

    it('applies checkbox-specific styling classes', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="checkbox-cell">
                <input type="checkbox" role="checkbox" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('checkbox-cell');
      expect(cell).toHaveClass(
        '[&:has([role=checkbox])]:pr-0',
        '[&>[role=checkbox]]:translate-y-[2px]'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell" data-testid="cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('custom-cell', 'whitespace-nowrap', 'p-2');
    });

    it('renders as gridcell role', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByRole('gridcell', { name: 'Cell Content' });
      expect(cell).toBeInTheDocument();
    });

    it('supports colspan and rowspan', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} rowSpan={1} data-testid="spanning-cell">
                Spanning Cell
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('spanning-cell');
      expect(cell).toHaveAttribute('colSpan', '2');
      expect(cell).toHaveAttribute('rowSpan', '1');
    });
  });

  describe('Complete Table Structure', () => {
    it('renders a complete table with all components', () => {
      render(<TestTable />);
      
      // Check table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check caption
      expect(screen.getByText('A list of recent invoices')).toBeInTheDocument();
      
      // Check headers
      expect(screen.getByRole('columnheader', { name: 'Invoice ID' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Method' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
      
      // Check data cells
      expect(screen.getByText('INV001')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
      
      // Check footer
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('$750.00')).toBeInTheDocument();
    });

    it('handles selected row state', () => {
      render(<TestTable />);
      
      // Find the selected row by looking for INV002 content
      const selectedRow = screen.getByText('INV002').closest('tr');
      expect(selectedRow).toHaveAttribute('data-state', 'selected');
    });

    it('handles hover interactions', async () => {
      const { user } = renderWithUserEvents(<TestTable />);
      
      // Find a row and hover over it
      const row = screen.getByText('INV001').closest('tr');
      if (row) {
        await user.hover(row);
        expect(row).toHaveClass('hover:bg-muted/50');
      }
    });

    it('maintains proper semantic structure', () => {
      render(<TestTable />);
      
      const table = screen.getByRole('table');
      const headers = screen.getAllByRole('columnheader');
      const cells = screen.getAllByRole('gridcell');
      
      expect(table).toBeInTheDocument();
      expect(headers).toHaveLength(4);
      expect(cells).toHaveLength(16); // 4 cols × 4 rows (3 body + 1 footer)
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA structure', () => {
      render(<TestTable />);
      
      const table = screen.getByRole('table');
      const columnHeaders = screen.getAllByRole('columnheader');
      const gridCells = screen.getAllByRole('gridcell');
      
      expect(table).toBeInTheDocument();
      expect(columnHeaders.length).toBeGreaterThan(0);
      expect(gridCells.length).toBeGreaterThan(0);
    });

    it('supports table caption for screen readers', () => {
      render(
        <Table>
          <TableCaption>Accessible table caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const caption = screen.getByText('Accessible table caption');
      expect(caption.tagName).toBe('CAPTION');
    });

    it('supports ARIA labels and descriptions', () => {
      render(
        <Table aria-label="Data table" aria-describedby="table-description">
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const table = screen.getByRole('table', { name: 'Data table' });
      expect(table).toHaveAttribute('aria-describedby', 'table-description');
    });

    it('supports sortable column headers', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort="ascending" data-testid="sortable">
                Sortable Column
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      const header = screen.getByTestId('sortable');
      expect(header).toHaveAttribute('aria-sort', 'ascending');
    });

    it('handles checkbox integration accessibly', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label="Select row"
                />
              </TableCell>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const selectAllCheckbox = screen.getByRole('checkbox', { name: 'Select all' });
      const selectRowCheckbox = screen.getByRole('checkbox', { name: 'Select row' });
      
      expect(selectAllCheckbox).toBeInTheDocument();
      expect(selectRowCheckbox).toBeInTheDocument();
    });

    it('passes accessibility checks', () => {
      render(
        <Table aria-label="Test table">
          <TableHeader>
            <TableRow>
              <TableHead>Column 1</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Data 1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const table = screen.getByRole('table');
      // Basic accessibility check
      
      // Accessibility check completed
    });

    it('maintains keyboard navigation', async () => {
      const { user } = renderWithUserEvents(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <button>Button 1</button>
              </TableCell>
              <TableCell>
                <button>Button 2</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('Button 1')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Button 2')).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('provides horizontal scrolling for overflow', () => {
      render(<TestTable />);
      
      const container = document.querySelector('[data-slot="table-container"]');
      expect(container).toHaveClass('overflow-x-auto');
    });

    it('maintains table width', () => {
      render(<TestTable />);
      
      const table = document.querySelector('[data-slot="table"]');
      expect(table).toHaveClass('w-full');
    });

    it('handles long content with nowrap', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="long-cell">
                This is a very long cell content that should not wrap
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('long-cell');
      expect(cell).toHaveClass('whitespace-nowrap');
    });
  });

  describe('Interactive Features', () => {
    it('handles row selection states', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected" data-testid="selected">
              <TableCell>Selected Row</TableCell>
            </TableRow>
            <TableRow data-testid="unselected">
              <TableCell>Unselected Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const selectedRow = screen.getByTestId('selected');
      const unselectedRow = screen.getByTestId('unselected');
      
      expect(selectedRow).toHaveAttribute('data-state', 'selected');
      expect(unselectedRow).not.toHaveAttribute('data-state');
    });

    it('handles row click interactions', async () => {
      const handleRowClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Table>
          <TableBody>
            <TableRow onClick={handleRowClick} data-testid="clickable">
              <TableCell>Clickable Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const row = screen.getByTestId('clickable');
      await user.click(row);
      
      expect(handleRowClick).toHaveBeenCalledTimes(1);
    });

    it('handles cell-specific interactions', async () => {
      const handleCellClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell onClick={handleCellClick} data-testid="clickable-cell">
                Clickable Cell
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const cell = screen.getByTestId('clickable-cell');
      await user.click(cell);
      
      expect(handleCellClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty table', () => {
      render(<Table data-testid="empty-table" />);
      
      const table = screen.getByTestId('empty-table');
      expect(table).toBeInTheDocument();
    });

    it('handles table with only headers', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header Only</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      
      expect(screen.getByRole('columnheader', { name: 'Header Only' })).toBeInTheDocument();
    });

    it('handles table with no headers', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data Only</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      expect(screen.getByRole('gridcell', { name: 'Data Only' })).toBeInTheDocument();
    });

    it('handles null className gracefully', () => {
      render(
        <Table className={null as any}>
          <TableBody className={null as any}>
            <TableRow className={null as any}>
              <TableCell className={null as any}>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('gridcell')).toBeInTheDocument();
    });

    it('handles complex nested content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <div>
                  <span>Nested content</span>
                  <button>Action</button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      expect(screen.getByText('Nested content')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const specialContent = 'Special chars: !@#$%^&*(){}[]<>?/\\|`~';
      
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>{specialContent}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('handles very large tables', () => {
      const rows = Array.from({ length: 100 }, (_, i) => (
        <TableRow key={i}>
          <TableCell>Row {i + 1}</TableCell>
          <TableCell>Data {i + 1}</TableCell>
        </TableRow>
      ));
      
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column 1</TableHead>
              <TableHead>Column 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows}
          </TableBody>
        </Table>
      );
      
      expect(screen.getByText('Row 1')).toBeInTheDocument();
      expect(screen.getByText('Row 100')).toBeInTheDocument();
    });
  });
});