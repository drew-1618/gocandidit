function convertDateToReadable(strDate) {
    if (!strDate || strDate === "Present") {
        return strDate
    }
    if (!strDate.includes('-')) {
        return strDate
    }
    const objMonthMap = {
        "01": "January",
        "02": "February",
        "03": "March",
        "04": "April",
        "05": "May",
        "06": "June",
        "07": "July",
        "08": "August",
        "09": "September",
        "10": "October",
        "11": "November",
        "12": "December"
    }
    const strYear = strDate.split('-')[0]
    const strMonth = objMonthMap[strDate.split('-')[1]]
    return `${strMonth} ${strYear}`
}

module.exports = {
    convertDateToReadable
}
