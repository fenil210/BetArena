/* eslint-disable react-refresh/only-export-components */
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const badgeClasses = {
    open: 'badge-open',
    active: 'badge-open',
    live: 'badge-open',
    locked: 'badge-locked',
    settled: 'badge-settled',
    completed: 'badge-settled',
    upcoming: 'badge-coming-soon',
    coming_soon: 'badge-coming-soon',
    cancelled: 'badge-voided',
    voided: 'badge-voided',
    lost: 'badge-voided',
    won: 'badge-open',
};

export function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function PageHeader({ icon, eyebrow, title, description, actions, className }) {
    return (
        <div className={cx('page-header', className)}>
            <div className="min-w-0">
                {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                <div className="flex items-center gap-3">
                    {icon && <div className="text-teal-800">{icon}</div>}
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
                </div>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Panel({ children, className = '', as = 'div', ...props }) {
    const Component = as;
    return <Component className={cx('surface', className)} {...props}>{children}</Component>;
}

export function MutedPanel({ children, className = '', as = 'div', ...props }) {
    const Component = as;
    return <Component className={cx('surface-muted', className)} {...props}>{children}</Component>;
}

export function Button({ variant = 'secondary', loading = false, className = '', children, disabled = false, type = 'button', ...props }) {
    const variantClass =
        variant === 'primary'
            ? 'btn-primary'
            : variant === 'danger'
                ? 'btn-danger'
                : 'btn-secondary';
    return (
        <button type={type} className={cx(variantClass, className)} disabled={loading || disabled} {...props}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}

export function IconButton({ label, className = '', children, type = 'button', ...props }) {
    return (
        <button type={type} aria-label={label} title={label} className={cx('icon-button', className)} {...props}>
            {children}
        </button>
    );
}

export function Badge({ status, children, className = '' }) {
    return (
        <span className={cx('badge', badgeClasses[status] || 'badge-settled', className)}>
            {children || String(status || '').replace('_', ' ')}
        </span>
    );
}

export function FormField({ label, children, hint, required = false }) {
    return (
        <div>
            <label className="form-label">
                {label}
                {required && <span className="text-red-600"> *</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

export function TextInput({ className = '', ...props }) {
    return <input className={cx('input-field', className)} {...props} />;
}

export function SelectInput({ children, className = '', ...props }) {
    return (
        <select className={cx('select-field', className)} {...props}>
            {children}
        </select>
    );
}

export function EmptyState({ icon, title, description, action, className = '' }) {
    return (
        <Panel className={cx('p-10 text-center', className)}>
            {icon && (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    {icon}
                </div>
            )}
            <p className="text-base font-semibold text-slate-950">{title}</p>
            {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </Panel>
    );
}

export function SkeletonBlock({ className = '' }) {
    return <div className={cx('animate-pulse rounded-md bg-slate-200', className)} />;
}

export function LoadingRows({ count = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <Panel key={i} className="p-4">
                    <SkeletonBlock className="mb-3 h-4 w-2/3" />
                    <SkeletonBlock className="h-3 w-1/3" />
                </Panel>
            ))}
        </div>
    );
}

export function StatCard({ icon, label, value, subValue, tone = 'neutral', loading = false }) {
    const toneClasses = {
        neutral: 'text-slate-700',
        teal: 'text-teal-800',
        gold: 'text-gold-700',
        red: 'text-red-700',
        blue: 'text-blue-800',
    };
    return (
        <Panel className="p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    {loading ? (
                        <SkeletonBlock className="mt-3 h-7 w-20" />
                    ) : (
                        <p className={cx('mt-2 text-2xl font-semibold tracking-tight', toneClasses[tone])}>{value}</p>
                    )}
                    {subValue && <p className="mt-1 text-xs text-slate-500">{subValue}</p>}
                </div>
                {icon && <div className={cx('rounded-md bg-slate-100 p-2', toneClasses[tone])}>{icon}</div>}
            </div>
        </Panel>
    );
}

export function SectionHeader({ icon, title, link, actionLabel = 'View all' }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                {icon && <div className="text-teal-800">{icon}</div>}
                <h2 className="truncate text-base font-semibold text-slate-950">{title}</h2>
            </div>
            {link && (
                <Link to={link} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-500 hover:text-teal-800">
                    {actionLabel}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            )}
        </div>
    );
}

export function Tabs({ items, activeKey, onChange }) {
    return (
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1">
            {items.map((item) => (
                <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={cx('tab-button whitespace-nowrap', activeKey === item.key && 'tab-button-active')}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
