import './SparkleCheckbox.css'

interface SparkleCheckboxProps {
    checked: boolean;
    onChange: () => void;
    unCheckedStyle?: {
        borderColor?: string;
        backgroundColor?: string;
    };
    checkedStyle?: {
        borderColor?: string;
        backgroundColor?: string;
        color?: string;
    };
}

export default function SparkleCheckbox({ checked, onChange, unCheckedStyle, checkedStyle }: SparkleCheckboxProps) {
    return (
        <label className="custom-checkbox-container">
            <input
                id="reversals-checkbox"
                type="checkbox"
                className="hidden-checkbox"
                checked={checked}
                onChange={onChange}
            />
            
            {/* This visual box handles standard styles and displays the SVG when active */}
            <span className="checkbox-visual-box" style={{ backgroundColor: checked ? checkedStyle?.backgroundColor : unCheckedStyle?.backgroundColor, borderColor: checked ? checkedStyle?.borderColor : unCheckedStyle?.borderColor }}>
                {checked && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" className="checkbox-svg-icon" style={{ fill: checkedStyle?.color }}>
                    <path d="M93.781 51.578C95 50.969 96 49.359 96 48c0-1.375-1-2.969-2.219-3.578 0 0-22.868-1.514-31.781-10.422-8.915-8.91-10.438-31.781-10.438-31.781 C50.969 1 49.375 0 48 0s-2.969 1-3.594 2.219 c0 0-1.5 22.87-10.406 31.781-8.908 8.913-31.781 10.422-31.781 10.422 C1 45.031 0 46.625 0 48c0 1.359 1 2.969 2.219 3.578 0 0 22.873 1.51 31.781 10.422 8.906 8.911 10.406 31.781 10.406 31.781 C45.031 95 46.625 96 48 96s2.969-1 3.562-2.219 c0 0 1.523-22.871 10.438-31.781 8.913-8.908 31.781-10.422 31.781-10.422Z" />
                </svg>
                )}
            </span>
        </label>
    )
}
