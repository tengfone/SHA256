import React from 'react'
function LandingPage({ heading, ...props }) {
    return (
        <div>
            {/* Can add a full size image here (https://www.youtube.com/watch?v=CKDkb_x3Ssw) */}
            <div className="w-full max-w-7xl mx-auto">
                {props.children}
            </div>
        </div>
    )
}

LandingPage.defaultProps = {
    heading: '',
};

export default LandingPage