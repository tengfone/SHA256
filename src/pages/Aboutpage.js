import React from 'react'

function Aboutpage() {
    return (
        <div>
            <div className="flex flex-row flex-wrap pt-10 justify-center">
                <a rel="noopener noreferrer" href="https://github.com/tengfone/SHA256" target="_blank">
                    <div className="p-2 bg-blue-800 items-center text-indigo-100 leading-none rounded-full flex lg:inline-flex" role="alert">
                        <span className="flex rounded-full bg-blue-500 uppercase px-2 py-1 text-xs font-bold mr-3">New</span>
                        <span className="font-semibold mr-2 text-left flex-auto">Check Out The Source Code!</span>
                        <svg className="fill-current opacity-75 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M12.95 10.707l.707-.707L8 4.343 6.586 5.757 10.828 10l-4.242 4.243L8 15.657l4.95-4.95z" /></svg>
                    </div>
                </a>
            </div>
            <div className="flex flex-row flex-wrap pt-5 justify-center">
                <p>Done By <a className="font-extrabold" rel="noopener noreferrer" href="https://www.github.com/tengfone" target="_blank">Teng Fone</a></p>
            </div>
        </div>
    )
}

export default Aboutpage
