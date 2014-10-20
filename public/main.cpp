#include <iostream>
#include <vector>
#include <string>
#include <sstream>

using namespace std;

bool isSymmetric (const string& n) {
    if (n.length() <= 1) return true;
    int mid = n.length() / 2;
    for (int i = 0; i <= mid; i++) {
        if (n[i] != n[n.length() - 1 - i])
            return false;
    }
    return true;
}

string getNextSymmetricNumber(const string& n) {
    if (n.length() <= 0) return n;

    int mid = n.length()/2;

    string r = n;

    for (int i = 0; i < mid; i++) {
        r[r.length() - 1 - i] = r[i];
    }

    if (r > n) {
        return r;
    } else {

        if (r.length() % 2) { // odds
            if (r[mid] < '9') {
                r[mid] = r[mid] + 1;
                return r;
            }
        }

        for (int i = mid - 1; i >= 0; i--) {

            if (r[i] < '9') {
                r[i] = r[i] + 1;
                r[r.length() - i - 1] = r[i];
                for (int j = r.length() - i - 2; j > i; j--) {
                    r[j] = '0';
                    r[r.length() - j - 1] = '0';
                }

                return r;
            }
        }

        r = "1" + r;
        r[r.length() - 1] = '1';
        for (size_t i = 1; i < (r.length() - 1); i++)
            r[i] = '0';
        return r;
    }
}

string int2str (int a) {
    stringstream ss;
    ss<<a;
    string temp;
    ss>>temp;
    return temp;
}

string next(int a) {
    for (int i = a + 1; i < 10000000; i++) {
        if (isSymmetric(int2str(i))) {
            return int2str(i);
        }
    }
    return "error";
}

int main () {
    int n = 2000000;
    int step = n / 100;
    for (int i = 1; i <= n; i++) {
        if ((i % step) == 0) cout<<i<<"\n";
        //cout<<i<<"\t"<<next(i)<<"\t"<<getNextSymmetricNumber(int2str(i));
        if (next(i) != getNextSymmetricNumber(int2str(i))) {
            cout<<i<<"\t"<<next(i)<<"\t"<<getNextSymmetricNumber(int2str(i))<<"\t error\n";
        } else {
            //cout<<"\n";
        }
    }

    return 0;
}
